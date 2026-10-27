//
//  SnoozeLiveActivity.swift
//  The snooze countdown: lock screen, StandBy and Dynamic Island, in Take My Pill's colors.
//  AlarmKit drives it: after Snooze the alarm is in `.countdown` mode until it rings again.
//

import ActivityKit
import AlarmKit
import AppIntents
import SwiftUI
import WidgetKit

@main
struct SnoozeWidgetBundle: WidgetBundle {
  var body: some Widget {
    SnoozeLiveActivity()
  }
}

// App palette (src/theme/tokens.ts, dark).
private let plum = Color(red: 0x15 / 255, green: 0x12 / 255, blue: 0x1D / 255)
private let pink = Color(red: 0xE8 / 255, green: 0x8A / 255, blue: 0x9A / 255)
private let textPrimary = Color(red: 0xF5 / 255, green: 0xF1 / 255, blue: 0xF7 / 255)
private let textSecondary = Color(red: 0xA7 / 255, green: 0x9F / 255, blue: 0xB8 / 255)

private typealias SnoozeContext = ActivityViewContext<AlarmAttributes<PillAlarmMetadata>>

private func meta(_ context: SnoozeContext) -> PillAlarmMetadata {
  context.attributes.metadata ?? PillAlarmMetadata()
}

/// End of the countdown, or nil when the alarm is not counting down.
private func fireDate(_ state: AlarmPresentationState) -> Date? {
  if case let .countdown(countdown) = state.mode {
    return countdown.fireDate
  }
  return nil
}

/// Start of the countdown (for the progress ring).
private func startDate(_ state: AlarmPresentationState) -> Date? {
  if case let .countdown(countdown) = state.mode {
    return countdown.startDate
  }
  return nil
}

private func rounded(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
  .system(size: size, weight: weight, design: .rounded)
}

struct SnoozeLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: AlarmAttributes<PillAlarmMetadata>.self) { context in
      LockScreenView(context: context)
        .activityBackgroundTint(plum)
        .activitySystemActionForegroundColor(pink)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          ExpandedLeading(context: context)
        }
        DynamicIslandExpandedRegion(.trailing) {
          CountdownText(state: context.state, size: 28)
        }
        DynamicIslandExpandedRegion(.bottom) {
          StopButton(context: context, compact: false)
        }
      } compactLeading: {
        Image(systemName: "zzz")
          .foregroundStyle(pink)
      } compactTrailing: {
        CountdownText(state: context.state, size: 14)
          .frame(maxWidth: 52)
      } minimal: {
        CountdownRing(context: context, lineWidth: 3)
      }
      .keylineTint(pink)
    }
  }
}

private struct LockScreenView: View {
  let context: SnoozeContext

  var body: some View {
    let m = meta(context)
    HStack(spacing: 14) {
      ZStack {
        CountdownRing(context: context, lineWidth: 6)
        Image(systemName: "zzz")
          .font(rounded(20, .bold))
          .foregroundStyle(pink)
      }
      .frame(width: 60, height: 60)

      VStack(alignment: .leading, spacing: 2) {
        Text(fireDate(context.state) == nil ? m.alertTitle : m.countdownTitle)
          .font(rounded(19, .bold))
          .foregroundStyle(textPrimary)
        if fireDate(context.state) != nil {
          Text(m.ringsInLabel)
            .font(rounded(14))
            .foregroundStyle(textSecondary)
        }
      }
      Spacer(minLength: 8)
      CountdownText(state: context.state, size: 34)
      StopButton(context: context, compact: true)
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 16)
    .environment(\.layoutDirection, m.lang == "he" ? .rightToLeft : .leftToRight)
  }
}

private struct ExpandedLeading: View {
  let context: SnoozeContext

  var body: some View {
    let m = meta(context)
    HStack(spacing: 8) {
      Image(systemName: "zzz")
        .font(rounded(18, .bold))
        .foregroundStyle(pink)
      VStack(alignment: .leading, spacing: 0) {
        Text(m.countdownTitle)
          .font(rounded(16, .bold))
          .foregroundStyle(textPrimary)
        Text(m.ringsInLabel)
          .font(rounded(12))
          .foregroundStyle(textSecondary)
      }
    }
    .environment(\.layoutDirection, m.lang == "he" ? .rightToLeft : .leftToRight)
  }
}

private struct CountdownText: View {
  let state: AlarmPresentationState
  let size: CGFloat

  var body: some View {
    if let end = fireDate(state) {
      // Range must never be inverted, or SwiftUI traps.
      Text(timerInterval: Date.now ... max(end, Date.now), countsDown: true)
        .font(rounded(size, .bold))
        .monospacedDigit()
        .foregroundStyle(pink)
        .multilineTextAlignment(.trailing)
        .lineLimit(1)
        .environment(\.layoutDirection, .leftToRight)
    }
  }
}

private struct CountdownRing: View {
  let context: SnoozeContext
  let lineWidth: CGFloat

  var body: some View {
    if let end = fireDate(context.state) {
      let fallback = end.addingTimeInterval(-max(60, meta(context).snoozeMinutes * 60))
      let start = min(startDate(context.state) ?? fallback, end)
      ProgressView(timerInterval: start ... max(end, start), countsDown: true) {
        EmptyView()
      } currentValueLabel: {
        EmptyView()
      }
      .progressViewStyle(.circular)
      .tint(pink)
    } else {
      Circle()
        .stroke(pink, lineWidth: lineWidth)
    }
  }
}

private struct StopButton: View {
  let context: SnoozeContext
  let compact: Bool

  var body: some View {
    let m = meta(context)
    Button(intent: StopSnoozeIntent(alarmId: m.alarmId)) {
      if compact {
        Image(systemName: "xmark")
          .font(rounded(14, .bold))
          .foregroundStyle(textPrimary)
          .frame(width: 36, height: 36)
          .background(Circle().fill(Color.white.opacity(0.12)))
      } else {
        Label(m.stopLabel, systemImage: "xmark")
          .font(rounded(15, .semibold))
          .foregroundStyle(textPrimary)
          .padding(.horizontal, 22)
          .padding(.vertical, 8)
          .background(Capsule().fill(Color.white.opacity(0.12)))
      }
    }
    .buttonStyle(.plain)
  }
}
