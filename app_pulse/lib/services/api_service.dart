import 'dart:async';
import 'dart:convert';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

class ApiRequestException implements Exception {
  final String type;
  final String message;
  final int? statusCode;

  const ApiRequestException({
    required this.type,
    required this.message,
    this.statusCode,
  });

  @override
  String toString() => message;
}

class ApiCallResult {
  final bool success;
  final String title;
  final String message;

  const ApiCallResult({
    required this.success,
    required this.title,
    required this.message,
  });
}

class ApiScenario {
  final String name;
  final String path;
  final Duration timeout;

  const ApiScenario({
    required this.name,
    required this.path,
    required this.timeout,
  });
}

class ApiService {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  static final String _sessionId = const Uuid().v4();
  static final Uuid _uuid = const Uuid();
  static const Map<String, ApiScenario> _scenarios = {
    "Normal API": ApiScenario(
      name: "GET /api/demo/ok",
      path: "/api/demo/ok",
      timeout: Duration(seconds: 4),
    ),
    "Slow API": ApiScenario(
      name: "GET /api/demo/slow",
      path: "/api/demo/slow",
      timeout: Duration(seconds: 3),
    ),
    "Server Error API": ApiScenario(
      name: "GET /api/demo/error",
      path: "/api/demo/error",
      timeout: Duration(seconds: 4),
    ),
    "Bad JSON API": ApiScenario(
      name: "GET /api/demo/bad-json",
      path: "/api/demo/bad-json",
      timeout: Duration(seconds: 4),
    ),
  };

  static Future<String> _getDeviceInfo() async {
    try {
      if (kIsWeb) {
        final info = await _deviceInfo.webBrowserInfo;
        return 'Web - ${info.browserName.name} on ${info.platform ?? 'unknown'}';
      }

      switch (defaultTargetPlatform) {
        case TargetPlatform.android:
          final info = await _deviceInfo.androidInfo;
          return 'Android - ${info.brand} ${info.model}';
        case TargetPlatform.iOS:
          final info = await _deviceInfo.iosInfo;
          return 'iOS - ${info.name} ${info.model}';
        case TargetPlatform.windows:
          final info = await _deviceInfo.windowsInfo;
          return 'Windows - build ${info.buildLab}';
        case TargetPlatform.macOS:
          final info = await _deviceInfo.macOsInfo;
          return 'macOS - ${info.model}';
        case TargetPlatform.linux:
          final info = await _deviceInfo.linuxInfo;
          return 'Linux - ${info.prettyName}';
        default:
          return 'Unknown device';
      }
    } catch (_) {
      return 'Unknown device';
    }
  }

  static String get _backendBaseUrl {
    if (kIsWeb) {
      return "http://127.0.0.1:5000";
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return "http://10.0.2.2:5000";
      default:
        return "http://127.0.0.1:5000";
    }
  }

  static Uri _backendUri(String path) {
    return Uri.parse("$_backendBaseUrl$path");
  }

  static Future<ApiCallResult> makeApiCall(String apiName) async {
    final scenario = _scenarios[apiName];

    if (scenario == null) {
      return const ApiCallResult(
        success: false,
        title: "Unknown action",
        message: "This API scenario is not configured.",
      );
    }

    final stopwatch = Stopwatch()..start();
    final deviceInfo = await _getDeviceInfo();
    final traceId = _uuid.v4();

    try {
      final response = await http
          .get(
            _backendUri(scenario.path),
            headers: {"Accept": "application/json"},
          )
          .timeout(scenario.timeout);

      final responseTime = stopwatch.elapsedMilliseconds;
      final Map<String, dynamic> payload =
          jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode >= 500) {
        throw ApiRequestException(
          type: "SERVER_ERROR",
          message:
              "${scenario.name} failed with status ${response.statusCode}: ${payload["message"] ?? "Server error"}",
          statusCode: response.statusCode,
        );
      }

      if (response.statusCode >= 400) {
        throw ApiRequestException(
          type: "HTTP_ERROR",
          message:
              "${scenario.name} failed with status ${response.statusCode}: ${payload["message"] ?? "Request failed"}",
          statusCode: response.statusCode,
        );
      }

      await _postMonitoringLog({
        "api_name": scenario.name,
        "response_time": responseTime,
        "status_code": response.statusCode,
        "timestamp": DateTime.now().toIso8601String(),
        "session_id": _sessionId,
        "device_info": deviceInfo,
        "trace_id": traceId,
      });

      return ApiCallResult(
        success: true,
        title: "Request succeeded",
        message: payload["message"]?.toString() ??
            "${scenario.name} completed in ${responseTime}ms",
      );
    } on TimeoutException catch (error, stackTrace) {
      await _recordFailure(
        apiName: scenario.name,
        errorType: "TIMEOUT",
        errorMessage:
            "${scenario.name} exceeded the ${scenario.timeout.inSeconds}s timeout window",
        responseTime: stopwatch.elapsedMilliseconds,
        deviceInfo: deviceInfo,
        traceId: traceId,
        stackTrace: stackTrace,
      );

      return const ApiCallResult(
        success: false,
        title: "Timeout detected",
        message: "The backend responded too slowly and was captured as a real timeout.",
      );
    } on FormatException catch (error, stackTrace) {
      await _recordFailure(
        apiName: scenario.name,
        errorType: "BAD_RESPONSE",
        errorMessage: "Invalid JSON response: ${error.message}",
        responseTime: stopwatch.elapsedMilliseconds,
        deviceInfo: deviceInfo,
        traceId: traceId,
        stackTrace: stackTrace,
      );

      return const ApiCallResult(
        success: false,
        title: "Bad response detected",
        message: "The app received malformed JSON and logged it as a parsing error.",
      );
    } on ApiRequestException catch (error, stackTrace) {
      await _recordFailure(
        apiName: scenario.name,
        errorType: error.type,
        errorMessage: error.message,
        responseTime: stopwatch.elapsedMilliseconds,
        statusCode: error.statusCode,
        deviceInfo: deviceInfo,
        traceId: traceId,
        stackTrace: stackTrace,
      );

      return ApiCallResult(
        success: false,
        title: "Server error captured",
        message: error.message,
      );
    } on http.ClientException catch (error, stackTrace) {
      await _recordFailure(
        apiName: scenario.name,
        errorType: "NETWORK_ERROR",
        errorMessage: "Network failure while calling ${scenario.name}: $error",
        responseTime: stopwatch.elapsedMilliseconds,
        deviceInfo: deviceInfo,
        traceId: traceId,
        stackTrace: stackTrace,
      );

      return const ApiCallResult(
        success: false,
        title: "Network error",
        message: "The request could not reach the backend and was logged as a network failure.",
      );
    } catch (error, stackTrace) {
      await _recordFailure(
        apiName: scenario.name,
        errorType: "UNEXPECTED_ERROR",
        errorMessage: "Unexpected failure while calling ${scenario.name}: $error",
        responseTime: stopwatch.elapsedMilliseconds,
        deviceInfo: deviceInfo,
        traceId: traceId,
        stackTrace: stackTrace,
      );

      return const ApiCallResult(
        success: false,
        title: "Unexpected error",
        message: "The app hit an unexpected runtime error and logged it for analysis.",
      );
    }
  }

  static Future<void> captureUnhandledError({
    required Object error,
    required StackTrace stackTrace,
    String source = "app",
  }) async {
    final deviceInfo = await _getDeviceInfo();

    await _postMonitoringLog({
      "api_name": "Unhandled App Error ($source)",
      "error_message": error.toString(),
      "error_type": "UNHANDLED_APP_ERROR",
      "stack_trace": stackTrace.toString(),
      "timestamp": DateTime.now().toIso8601String(),
      "session_id": _sessionId,
      "device_info": deviceInfo,
      "trace_id": _uuid.v4(),
    });
  }

  static Future<void> _recordFailure({
    required String apiName,
    required String errorType,
    required String errorMessage,
    required int responseTime,
    required String deviceInfo,
    required String traceId,
    required StackTrace stackTrace,
    int? statusCode,
  }) async {
    await _postMonitoringLog({
      "api_name": apiName,
      "response_time": responseTime,
      "status_code": statusCode,
      "error_message": errorMessage,
      "error_type": errorType,
      "stack_trace": stackTrace.toString(),
      "timestamp": DateTime.now().toIso8601String(),
      "session_id": _sessionId,
      "device_info": deviceInfo,
      "trace_id": traceId,
    });
  }

  static Future<void> _postMonitoringLog(Map<String, dynamic> logData) async {
    try {
      final postResponse = await http
          .post(
            _backendUri("/api/logs"),
            headers: {"Content-Type": "application/json"},
            body: jsonEncode(logData),
          )
          .timeout(const Duration(seconds: 3));

      debugPrint("Monitoring response status: ${postResponse.statusCode}");
    } catch (error) {
      debugPrint("Monitoring backend unavailable: $error");
    }
  }
}
