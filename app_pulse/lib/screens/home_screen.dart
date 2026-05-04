import 'package:flutter/material.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? _busyAction;
  ApiCallResult? _lastResult;

  Future<void> _runAction(String actionName) async {
    if (actionName == "Unhandled App Error") {
      Future<void>.microtask(() {
        throw StateError("Unhandled UI exception triggered from HomeScreen");
      });

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Triggered an unhandled app error. Check the dashboard in real time."),
        ),
      );
      return;
    }

    setState(() {
      _busyAction = actionName;
    });

    final result = await ApiService.makeApiCall(actionName);

    if (!mounted) {
      return;
    }

    setState(() {
      _busyAction = null;
      _lastResult = result;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: result.success ? Colors.green.shade700 : Colors.red.shade700,
        content: Text(result.message),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final actions = [
      ("Normal API", Colors.blue),
      ("Slow API", Colors.orange),
      ("Server Error API", Colors.red),
      ("Bad JSON API", Colors.purple),
      ("Unhandled App Error", Colors.black87),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text("AppPulse Dashboard")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              "Run practical monitoring scenarios",
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            const Text(
              "Each button makes a real request to your backend and logs the result to AppPulse immediately.",
            ),
            const SizedBox(height: 20),
            ...actions.map((action) {
              final isBusy = _busyAction == action.$1;

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ElevatedButton(
                  onPressed: _busyAction == null ? () => _runAction(action.$1) : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: action.$2,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: isBusy
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text(action.$1),
                ),
              );
            }),
            const SizedBox(height: 16),
            if (_lastResult != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _lastResult!.title,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(_lastResult!.message),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 12),
            const Text(
              "Tip: Open the React dashboard while pressing these buttons to watch logs, alerts, and analytics update in real time.",
            ),
          ],
        ),
      ),
    );
  }
}
