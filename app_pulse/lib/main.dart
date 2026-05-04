import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';
import 'services/api_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    unawaited(
      ApiService.captureUnhandledError(
        error: details.exception,
        stackTrace: details.stack ?? StackTrace.current,
        source: 'flutter_framework',
      ),
    );
  };

  PlatformDispatcher.instance.onError = (error, stackTrace) {
    unawaited(
      ApiService.captureUnhandledError(
        error: error,
        stackTrace: stackTrace,
        source: 'platform_dispatcher',
      ),
    );
    return true;
  };

  runZonedGuarded(() {
    runApp(const MyApp());
  }, (error, stackTrace) {
    unawaited(
      ApiService.captureUnhandledError(
        error: error,
        stackTrace: stackTrace,
        source: 'run_zoned_guarded',
      ),
    );
  });
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'AppPulse',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
      ),
      home: SplashScreen(),
    );
  }
}
