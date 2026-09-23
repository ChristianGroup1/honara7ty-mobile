import Flutter
import UIKit
import CryptoKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    guard let controller = window?.rootViewController as? FlutterViewController else {
      return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }
    FlutterMethodChannel(
      name: "honara7ty/legacy_async_storage",
      binaryMessenger: controller.binaryMessenger
    ).setMethodCallHandler { call, result in
      guard call.method == "readAll" else {
        result(FlutterMethodNotImplemented)
        return
      }
      result(self.readReactNativeAsyncStorage())
    }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  private func readReactNativeAsyncStorage() -> [String: String] {
    let manager = FileManager.default
    let bundleId = Bundle.main.bundleIdentifier ?? "com.honara7ty.app"
    let applicationSupport = manager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
    let documents = manager.urls(for: .documentDirectory, in: .userDomainMask).first
    let directories = [
      applicationSupport?.appendingPathComponent(bundleId).appendingPathComponent("RCTAsyncLocalStorage_V1"),
      documents?.appendingPathComponent("RCTAsyncLocalStorage_V1"),
      documents?.appendingPathComponent("RNCAsyncLocalStorage_V1"),
    ].compactMap { $0 }

    for directory in directories {
      let manifest = directory.appendingPathComponent("manifest.json")
      guard let data = try? Data(contentsOf: manifest),
            let values = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        continue
      }
      var result = [String: String]()
      for (key, rawValue) in values {
        if let value = rawValue as? String {
          result[key] = value
        } else if rawValue is NSNull {
          let file = directory.appendingPathComponent(md5(key))
          if let value = try? String(contentsOf: file, encoding: .utf8) {
            result[key] = value
          }
        }
      }
      return result
    }
    return [:]
  }

  private func md5(_ value: String) -> String {
    let digest = Insecure.MD5.hash(data: Data(value.utf8))
    return digest.map { String(format: "%02hhx", $0) }.joined()
  }
}
