//
//  PillAlarmShared.swift
//  Compiled into BOTH the main app and the SnoozeCountdown widget (apple-targets `_shared`).
//
//  - PillAlarmMetadata: AlarmKit's metadata type. The widget decodes it to draw the countdown,
//    so the exact same type must exist in both targets.
//  - StopSnoozeIntent: the Stop (X) button on the countdown. It is shown by the widget but runs
//    in the app's process, so it must be in both targets too. Self-contained on purpose.
//

import Foundation
import AlarmKit
import AppIntents

nonisolated struct PillAlarmMetadata: AlarmMetadata {
  /// "he" or "en" - the APP's language (not the phone's), so the countdown reads the right way.
  var lang: String = "en"
  var alarmId: String = ""
  var alertTitle: String = "Take your pill"
  var countdownTitle: String = "Snoozed"
  var ringsInLabel: String = "Rings again in"
  var stopLabel: String = "Stop"
  /// Snooze length, used to draw the progress ring.
  var snoozeMinutes: Double = 5
}

struct StopSnoozeIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Stop snooze"
  static let description = IntentDescription("Ends the snooze countdown without ringing again.")
  static let isDiscoverable: Bool = false

  @Parameter(title: "Alarm ID")
  var alarmId: String

  init() {
    self.alarmId = ""
  }

  init(alarmId: String) {
    self.alarmId = alarmId
  }

  func perform() async throws -> some IntentResult {
    if let uuid = UUID(uuidString: alarmId) {
      try? AlarmManager.shared.cancel(id: uuid)
    }
    // Same event log the app drains (key mirrored in PillAlarmCore.swift / PillAlarmModule.swift).
    let key = "pillalarm.events"
    let defaults = UserDefaults.standard
    var events = defaults.array(forKey: key) as? [[String: Any]] ?? []
    events.append(["action": "snoozeStopped", "alarmId": alarmId.lowercased(), "at": Date().timeIntervalSince1970 * 1000])
    if events.count > 50 { events.removeFirst(events.count - 50) }
    defaults.set(events, forKey: key)
    return .result()
  }
}
