import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static Future<void> makeApiCall(String apiName) async {
    var startTime = DateTime.now();

    try {
      // For "Error API", throw exception directly to trigger error handling
      if (apiName == "Error API") {
        throw Exception("Simulated API failure");
      }

      // For "Slow API", add artificial delay before the actual API call
      if (apiName == "Slow API") {
        await Future.delayed(Duration(seconds: 3));
      }

      final response = await http.get(
        Uri.parse("https://jsonplaceholder.typicode.com/posts/1"),
      );

      var endTime = DateTime.now();
      var responseTime =
          endTime.difference(startTime).inMilliseconds;

      Map<String, dynamic> logData = {
        "api_name": apiName,
        "response_time": responseTime,
        "status_code": response.statusCode,
        "timestamp": DateTime.now().toIso8601String(),
      };

      print(jsonEncode(logData));

      //  Send to backend
      print("Sending request to backend...");
      try {
        final postResponse = await http.post(
          Uri.parse("http://127.0.0.1:5000/api/logs"),
          headers: {"Content-Type": "application/json"},
          body: jsonEncode(logData),
        );
        print("Backend response status: ${postResponse.statusCode}");
      } catch (postError) {
        print("Error sending to backend: $postError");
      }

      print("Log sent to backend");

    } catch (e) {
      print("Error occurred: $e");
      
      Map<String, dynamic> errorLog = {
        "api_name": apiName,
        "error_message": e.toString(),
        "timestamp": DateTime.now().toIso8601String(),
      };

      print(jsonEncode(errorLog));

      // Send error to backend
      print("Sending request to backend...");
      try {
        final postResponse = await http.post(
          Uri.parse("http://127.0.0.1:5000/api/logs"),
          headers: {"Content-Type": "application/json"},
          body: jsonEncode(errorLog),
        );
        print("Backend response status: ${postResponse.statusCode}");
      } catch (postError) {
        print("Error sending to backend: $postError");
      }
    }
  }
}