import 'dart:convert';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

class ApiService {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  static final String _sessionId = const Uuid().v4();
  static final Uuid _uuid = const Uuid();

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

  static Future<void> makeApiCall(String apiName) async {
    final startTime = DateTime.now();
    final deviceInfo = await _getDeviceInfo();
    final traceId = _uuid.v4();

    try {
      if (apiName == "Error API") {
        throw Exception("Simulated API failure");
      }

      if (apiName == "Slow API") {
        await Future.delayed(const Duration(seconds: 3));
      }

      final response = await http.get(
        Uri.parse("https://jsonplaceholder.typicode.com/posts/1"),
      );

      final endTime = DateTime.now();
      final responseTime = endTime.difference(startTime).inMilliseconds;

      final Map<String, dynamic> logData = {
        "api_name": apiName,
        "response_time": responseTime,
        "status_code": response.statusCode,
        "timestamp": DateTime.now().toIso8601String(),
        "session_id": _sessionId,
        "device_info": deviceInfo,
        "trace_id": traceId,
      };

      print(jsonEncode(logData));

      final postResponse = await http.post(
        Uri.parse("http://127.0.0.1:5000/api/logs"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode(logData),
      );

      print("Backend response status: ${postResponse.statusCode}");
    } catch (e) {
      print("Error occurred: $e");

      final Map<String, dynamic> errorLog = {
        "api_name": apiName,
        "error_message": e.toString(),
        "timestamp": DateTime.now().toIso8601String(),
        "session_id": _sessionId,
        "device_info": deviceInfo,
        "trace_id": traceId,
      };

      print(jsonEncode(errorLog));

      final postResponse = await http.post(
        Uri.parse("http://127.0.0.1:5000/api/logs"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode(errorLog),
      );

      print("Backend response status: ${postResponse.statusCode}");
    }
  }
}
