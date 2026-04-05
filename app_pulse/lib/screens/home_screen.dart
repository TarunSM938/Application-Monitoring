import 'package:flutter/material.dart';
import '../services/api_service.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  void normalApiCall() async {
    await ApiService.makeApiCall("Normal API");
  }

  void slowApiCall() async {
    await Future.delayed(Duration(seconds: 3));
    await ApiService.makeApiCall("Slow API");
  }

  void errorApiCall() async {
    await ApiService.makeApiCall("Error API");
  }

  void crashApp() async {
    try {
      await ApiService.makeApiCall("Crash API");
    } catch (e) {
      print("Error sending crash log: $e");
    }
    throw Exception("App Crashed!");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("AppPulse Dashboard")),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            ElevatedButton(
              onPressed: normalApiCall,
              child: Text("Normal API Call"),
            ),
            SizedBox(height: 10),

            ElevatedButton(
              onPressed: slowApiCall,
              child: Text("Slow API Call"),
            ),
            SizedBox(height: 10),

            ElevatedButton(
              onPressed: errorApiCall,
              child: Text("Error API Call"),
            ),
            SizedBox(height: 10),

            ElevatedButton(
              onPressed: crashApp,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: Text("Crash App"),
            ),
          ],
        ),
      ),
    );
  }
}
