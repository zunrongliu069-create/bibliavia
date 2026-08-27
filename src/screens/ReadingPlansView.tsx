import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Eyebrow, ProgressBar } from '../components/ui';
import { readingPlanById, readingPlans } from '../data/readingPlans';
import { t } from '../lib/i18n';
import { colors, radius } from '../theme';
import { useAppStore } from '../store/AppStore';

export function ReadingPlansView({
  onOpenReference,
  compact = false,
}: {
  onOpenReference: (canonicalReference: string, displayReference: string) => void;
  compact?: boolean;
}) {
  const store = useAppStore();
  const activeId = store.progress.activeReadingPlanId;
  const activePlan = activeId ? readingPlanById(activeId) : undefined;
  const activeProgress = activeId ? store.progress.readingPlanProgress[activeId] : undefined;
  const suggestedDay = activePlan
    ? (activePlan.days.find((item) => !activeProgress?.completedDays.includes(item.day))?.day ??
      activePlan.durationDays)
    : 1;
  const [selectedDay, setSelectedDay] = useState(suggestedDay);
  const [showCatalog, setShowCatalog] = useState(!compact);
  const selected = activePlan?.days.find((item) => item.day === selectedDay) ?? activePlan?.days[0];
  const complete = Boolean(selected && activeProgress?.completedDays.includes(selected.day));
  return (
    <View style={styles.root}>
      {activePlan && activeProgress && (
        <Card style={[styles.active, { borderColor: activePlan.color }]}>
          <View style={styles.activeTop}>
            <View style={[styles.planIcon, { backgroundColor: activePlan.color }]}>
              <Text style={styles.planIconText}>{activePlan.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow>{t(store.uiLanguage, 'activePlan').toUpperCase()}</Eyebrow>
              <Text style={styles.activeTitle}>{activePlan.title[store.uiLanguage]}</Text>
              <Text style={styles.activeSub}>
                {activeProgress.completedDays.length}/{activePlan.durationDays}{' '}
                {t(store.uiLanguage, 'days')}
              </Text>
            </View>
            {activeProgress.paused && (
              <Text style={styles.paused}>{t(store.uiLanguage, 'paused')}</Text>
            )}
          </View>
          <ProgressBar
            value={activeProgress.completedDays.length / activePlan.durationDays}
            color={activePlan.color}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayRail}
          >
            {activePlan.days.map((item) => {
              const done = activeProgress.completedDays.includes(item.day);
              return (
                <Pressable
                  key={item.day}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(store.uiLanguage, 'day')} ${item.day}`}
                  accessibilityState={{ selected: selectedDay === item.day }}
                  onPress={() => setSelectedDay(item.day)}
                  style={[
                    styles.dayDot,
                    done && styles.dayDone,
                    selectedDay === item.day && { borderColor: activePlan.color, borderWidth: 3 },
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={15} color={colors.white} />
                  ) : (
                    <Text style={styles.dayNumber}>{item.day}</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
          {selected && (
            <View style={styles.today}>
              <View style={styles.todayTop}>
                <Text style={styles.todayTitle}>
                  {t(store.uiLanguage, 'day')} {selected.day}
                </Text>
                {complete && <Ionicons name="checkmark-circle" size={23} color={colors.mint} />}
              </View>
              {selected.references[store.uiLanguage].map((reference, index) => (
                <Pressable
                  key={`${reference}-${index}`}
                  accessibilityRole="link"
                  accessibilityLabel={`${t(store.uiLanguage, 'openPassage')} ${reference}`}
                  onPress={() =>
                    onOpenReference(selected.references.en[index] ?? reference, reference)
                  }
                  style={({ pressed }) => [styles.reference, pressed && { opacity: 0.72 }]}
                >
                  <Ionicons name="book-outline" size={18} color={activePlan.color} />
                  <Text style={styles.referenceText}>{reference}</Text>
                  <Ionicons name="open-outline" size={18} color={activePlan.color} />
                </Pressable>
              ))}
            </View>
          )}
          <Button
            label={
              complete
                ? t(store.uiLanguage, 'readComplete')
                : t(store.uiLanguage, 'markDayComplete')
            }
            variant={complete ? 'secondary' : 'primary'}
            disabled={complete}
            onPress={() => selected && store.completeReadingPlanDay(activePlan.id, selected.day)}
          />
          <Button
            label={
              activeProgress.paused
                ? t(store.uiLanguage, 'resumePlan')
                : t(store.uiLanguage, 'pausePlan')
            }
            variant="ghost"
            onPress={() => store.toggleReadingPlanPause(activePlan.id)}
          />
        </Card>
      )}
      {compact && (
        <Button
          label={
            showCatalog ? t(store.uiLanguage, 'hidePlans') : t(store.uiLanguage, 'browsePlans')
          }
          variant="ghost"
          onPress={() => setShowCatalog((visible) => !visible)}
        />
      )}
      {showCatalog && (
        <>
          <View>
            <Text style={styles.heading}>{t(store.uiLanguage, 'planCatalog')}</Text>
            <Text style={styles.notice}>{t(store.uiLanguage, 'planContentNotice')}</Text>
          </View>
          <View style={styles.catalog}>
            {readingPlans.map((plan) => {
              const progress = store.progress.readingPlanProgress[plan.id];
              const done = progress?.completedDays.length ?? 0;
              return (
                <Card key={plan.id} style={styles.plan}>
                  <View style={styles.planTop}>
                    <View style={[styles.smallIcon, { backgroundColor: `${plan.color}20` }]}>
                      <Text style={styles.smallIconText}>{plan.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planTitle}>{plan.title[store.uiLanguage]}</Text>
                      <Text style={styles.planDuration}>
                        {plan.durationDays} {t(store.uiLanguage, 'days')}
                      </Text>
                    </View>
                    {progress && (
                      <Text style={styles.saved}>
                        {done}/{plan.durationDays}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.planDescription}>{plan.description[store.uiLanguage]}</Text>
                  {progress && <ProgressBar value={done / plan.durationDays} color={plan.color} />}
                  <Button
                    label={
                      progress
                        ? t(store.uiLanguage, 'resumePlan')
                        : t(store.uiLanguage, 'startPlan')
                    }
                    variant={activeId === plan.id ? 'secondary' : 'ghost'}
                    onPress={() => {
                      store.startReadingPlan(plan.id);
                      setSelectedDay(
                        plan.days.find((item) => !progress?.completedDays.includes(item.day))
                          ?.day ?? 1,
                      );
                    }}
                  />
                </Card>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  active: { gap: 14, borderWidth: 2 },
  activeTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIconText: { fontSize: 29 },
  activeTitle: { fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 3 },
  activeSub: { fontSize: 12, color: colors.muted, marginTop: 3 },
  paused: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.coral,
    backgroundColor: '#FBE4E0',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  dayRail: { gap: 7, paddingVertical: 2 },
  dayDot: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDone: { backgroundColor: colors.mint, borderColor: colors.mint },
  dayNumber: { fontSize: 11, fontWeight: '900', color: colors.muted },
  today: { gap: 9, backgroundColor: colors.paper, padding: 14, borderRadius: radius.md },
  todayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  reference: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: radius.sm,
  },
  referenceText: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.inkSoft },
  heading: { fontSize: 22, fontWeight: '900', color: colors.ink },
  notice: { fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 5 },
  catalog: { gap: 11 },
  plan: { gap: 12 },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  smallIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallIconText: { fontSize: 24 },
  planTitle: { fontSize: 17, fontWeight: '900', color: colors.ink },
  planDuration: { fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 3 },
  saved: { fontSize: 11, fontWeight: '900', color: colors.primary },
  planDescription: { fontSize: 13, lineHeight: 19, color: colors.inkSoft },
});
