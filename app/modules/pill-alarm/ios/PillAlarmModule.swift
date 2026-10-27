import ExpoModulesCore

struct ScheduleOptions: Record {
  @Field var id: String = ""
  @Field var fireAt: Double = 0
  @Field var title: String = ""
  @Field var buttonText: String = ""
  @Field var buttonSymbol: String = "pills.fill"
  @Field var sound: String = ""
  @Field var tintHex: String = "#E88A9A"
  @Field var snoozeMinutes: Double = 0
  @Field var lang: String = "en"
  @Field var countdownTitle: String = ""
  @Field var ringsInLabel: String = ""
  @Field var stopLabel: String = ""
}

struct BridgeStrings: Record {
  @Field var tapToOpenTitle: String = ""
  @Field var tapToOpenBody: String = ""
}

/// Keys shared with native/ios/PillAlarmCore.swift (UserDefaults.standard, same process).
enum PillAlarmKeys {
  static let events = "pillalarm.events"
  static let tapToOpenTitle = "pillalarm.strings.tapToOpenTitle"
  static let tapToOpenBody = "pillalarm.strings.tapToOpenBody"
}

public class PillAlarmModule: Module {
  private var core: PillAlarmCoreProtocol? = {
    guard let cls = NSClassFromString("PillAlarmCore") as? NSObject.Type else {
      return nil
    }
    return cls.init() as? PillAlarmCoreProtocol
  }()

  public func definition() -> ModuleDefinition {
    Name("PillAlarm")

    Function("isAvailable") { () -> Bool in
      return self.core != nil
    }

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      guard let core = self.core else {
        promise.reject("E_NO_CORE", "PillAlarmCore is not compiled into the app target")
        return
      }
      core.requestAuthorization { state, error in
        if let error = error {
          promise.reject("E_AUTH", error.localizedDescription)
        } else {
          promise.resolve(state ?? "unknown")
        }
      }
    }

    Function("authorizationState") { () -> String in
      return self.core?.authorizationState() ?? "unavailable"
    }

    AsyncFunction("schedule") { (options: ScheduleOptions, promise: Promise) in
      guard let core = self.core else {
        promise.reject("E_NO_CORE", "PillAlarmCore is not compiled into the app target")
        return
      }
      let dict: [String: Any] = [
        "id": options.id,
        "fireAt": options.fireAt,
        "title": options.title,
        "buttonText": options.buttonText,
        "buttonSymbol": options.buttonSymbol,
        "sound": options.sound,
        "tintHex": options.tintHex,
        "snoozeMinutes": options.snoozeMinutes,
        "lang": options.lang,
        "countdownTitle": options.countdownTitle,
        "ringsInLabel": options.ringsInLabel,
        "stopLabel": options.stopLabel,
      ]
      core.schedule(dict) { error in
        if let error = error {
          promise.reject("E_SCHEDULE", error.localizedDescription)
        } else {
          promise.resolve(nil)
        }
      }
    }

    AsyncFunction("cancel") { (id: String) throws in
      if let error = self.core?.cancel(id) {
        throw Exception(name: "E_CANCEL", description: error.localizedDescription)
      }
    }

    AsyncFunction("cancelAll") { () throws in
      if let error = self.core?.cancelAll() {
        throw Exception(name: "E_CANCEL_ALL", description: error.localizedDescription)
      }
    }

    AsyncFunction("listScheduled") { () -> [String] in
      return self.core?.listScheduled() ?? []
    }

    Function("listAlarms") { () -> [String] in
      return self.core?.listAlarms() ?? []
    }

    Function("listSkipped") { () -> [String] in
      return self.core?.listSkipped() ?? []
    }

    /// Strings the intents need when they run with the JS side asleep (localized by JS).
    Function("setStrings") { (strings: BridgeStrings) in
      let defaults = UserDefaults.standard
      defaults.set(strings.tapToOpenTitle, forKey: PillAlarmKeys.tapToOpenTitle)
      defaults.set(strings.tapToOpenBody, forKey: PillAlarmKeys.tapToOpenBody)
    }

    /// Returns and clears the events the intents recorded while JS was not running.
    Function("drainEvents") { () -> [[String: Any]] in
      let defaults = UserDefaults.standard
      let events = defaults.array(forKey: PillAlarmKeys.events) as? [[String: Any]] ?? []
      defaults.removeObject(forKey: PillAlarmKeys.events)
      return events
    }
  }
}
