import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Eyebrow, ProgressBar } from '../components/ui';
import { characterById, characters, rarityColors } from '../data/characters';
import {
  biblePeriods,
  highestUnlockedPeriodForLevel,
  PERIOD_MASTERY_RATIO,
  periodState,
} from '../data/periods';
import { characterLevel } from '../lib/achievements';
import { t } from '../lib/i18n';
import { dailyShardShopOffers } from '../lib/shardShop';
import { dailyFreeOfferFor, resourceShopOffers } from '../lib/shop';
import { levelForXp } from '../lib/level';
import { colors, radius } from '../theme';
import type { BiblePeriodId, CharacterId, CharacterRarity } from '../types';
import { useAppStore } from '../store/AppStore';

type Filter = 'all' | CharacterRarity;
const rarityOrder: Record<CharacterRarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export function CollectionScreen() {
  const store = useAppStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [periodId, setPeriodId] = useState<BiblePeriodId>(1);
  const [selected, setSelected] = useState<CharacterId | null>(null);
  const periodProgress = biblePeriods.map((period) => {
    const members = characters.filter((character) => character.period === period.id);
    const unlocked = members.filter(
      (character) => (store.progress.characterShards[character.id] ?? 0) >= character.unlockCost,
    ).length;
    return {
      ...period,
      unlocked,
      total: members.length,
      percentage: Math.round((unlocked / members.length) * 100),
    };
  });
  const currentLevel = levelForXp(store.progress.xp);
  const highestUnlockedPeriod = highestUnlockedPeriodForLevel(currentLevel);
  const selectedPeriod = periodProgress[periodId - 1]!;
  const visible = useMemo(
    () =>
      filter === 'all'
        ? characters
            .filter((item) => item.period === periodId)
            .sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity])
        : characters.filter((item) => item.period === periodId && item.rarity === filter),
    [filter, periodId],
  );
  const shopOffers = useMemo(
    () =>
      dailyShardShopOffers(
        characters.filter((character) => character.period <= highestUnlockedPeriod),
        Math.floor(Date.now() / 86_400_000),
      ),
    [highestUnlockedPeriod],
  );
  const collected = characters.filter(
    (item) => (store.progress.characterShards[item.id] ?? 0) >= item.unlockCost,
  ).length;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dailyFree = dailyFreeOfferFor(Math.floor(Date.now() / 86_400_000));
  const dailyClaimed = store.progress.lastDailyFreeClaim === today;
  if (selected) {
    const character = characterById(selected);
    const shards = store.progress.characterShards[selected] ?? 0;
    const unlocked = shards >= character.unlockCost;
    const periodLocked = character.period > highestUnlockedPeriod;
    const active = store.progress.targetCharacter === selected;
    const level = characterLevel(shards, character.unlockCost);
    const levelStart = level === 0 ? 0 : character.unlockCost * level;
    const levelTarget = character.unlockCost * (level + 1);
    return (
      <ScrollView contentContainerStyle={styles.detailPage}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(store.uiLanguage, 'collection')}
          onPress={() => setSelected(null)}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
          <Text style={styles.backText}>{t(store.uiLanguage, 'collection')}</Text>
        </Pressable>
        <View style={[styles.heroFrame, { borderColor: rarityColors[character.rarity] }]}>
          {character.image ? (
            <Image source={character.image} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.portraitPlaceholder]}>
              <Text style={styles.portraitPlaceholderText}>
                {biblePeriods[character.period - 1]!.icon}
              </Text>
            </View>
          )}
          <View style={[styles.rarityBadge, { backgroundColor: rarityColors[character.rarity] }]}>
            <Text style={styles.rarityBadgeText}>
              {t(store.uiLanguage, character.rarity).toUpperCase()}
            </Text>
          </View>
          {level > 0 && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Lv.{level}</Text>
            </View>
          )}
        </View>
        <Text style={styles.detailName}>{character.names[store.uiLanguage]}</Text>
        <Text style={styles.periodTag}>
          {biblePeriods[character.period - 1]!.icon}{' '}
          {biblePeriods[character.period - 1]!.names[store.uiLanguage]}
        </Text>
        {periodLocked && (
          <Text style={styles.lockedNotice}>
            Preview only · Reach level {biblePeriods[character.period - 1]!.unlockLevel} to unlock
            this period.
          </Text>
        )}
        <Text style={styles.detailDescription}>{character.description[store.uiLanguage]}</Text>
        <View style={styles.progressCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.progressTitle}>
              {t(store.uiLanguage, 'characterLevel')} {level}
            </Text>
            <Text style={[styles.stateText, { color: unlocked ? colors.mint : colors.muted }]}>
              {t(store.uiLanguage, unlocked ? 'unlocked' : 'locked')}
            </Text>
          </View>
          <ProgressBar
            value={level >= 4 ? 1 : (shards - levelStart) / (levelTarget - levelStart)}
            color={rarityColors[character.rarity]}
          />
          <Text style={styles.levelHint}>
            {level >= 4
              ? t(store.uiLanguage, 'maxLevel')
              : `🧩 ${shards} / ${levelTarget} · ${t(store.uiLanguage, 'nextLevel')}`}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Eyebrow>{t(store.uiLanguage, 'references').toUpperCase()}</Eyebrow>
          <Text style={styles.books}>{character.books.join(' · ')}</Text>
          <Text style={styles.refs}>{character.references.join('  •  ')}</Text>
        </View>
        <Button
          label={active ? t(store.uiLanguage, 'activeTarget') : t(store.uiLanguage, 'chooseTarget')}
          variant={active ? 'secondary' : 'primary'}
          disabled={active || periodLocked}
          onPress={() => store.setTargetCharacter(character.id)}
        />
        <Button
          label={`🪙 500 · ${t(store.uiLanguage, 'buyShards')}`}
          variant="secondary"
          disabled={store.progress.gold < 500 || periodLocked}
          onPress={() => store.buyCharacterShards(character.id)}
        />
        <Button
          label={`🃏 ${store.progress.wildShards} · Apply 1 Wild Shard`}
          variant="secondary"
          disabled={store.progress.wildShards < 1 || periodLocked}
          onPress={() => store.applyWildShard(character.id)}
        />
        <View style={{ height: 24 }} />
      </ScrollView>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.logo}>SCRIPTORA</Text>
          <Text style={styles.title}>{t(store.uiLanguage, 'collection')}</Text>
          <Text style={styles.subtitle}>
            {collected} / {characters.length} {t(store.uiLanguage, 'characterCards')}
          </Text>
        </View>
        <View style={styles.gold}>
          <Text style={styles.goldText}>🪙 {store.progress.gold}</Text>
        </View>
      </View>
      <View style={styles.periodSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periods}
        >
          {periodProgress.map((period) => {
            const locked = period.id > highestUnlockedPeriod;
            return (
              <Pressable
                key={period.id}
                accessibilityRole="button"
                onPress={() => setPeriodId(period.id)}
                accessibilityLabel={`${period.names[store.uiLanguage]}${locked ? ' · locked preview' : ''}`}
                style={[
                  styles.periodCard,
                  periodId === period.id && styles.periodCardActive,
                  locked && styles.disabledPeriod,
                ]}
              >
                <Text style={styles.periodIcon}>{locked ? '🔒' : period.icon}</Text>
                <Text numberOfLines={2} style={styles.periodName}>
                  {period.names[store.uiLanguage]}
                </Text>
                <Text style={styles.periodPercent}>{period.percentage}%</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.periodSummary}>
          <View style={{ flex: 1 }}>
            <Text style={styles.periodSummaryTitle}>{selectedPeriod.names[store.uiLanguage]}</Text>
            <Text style={styles.periodSummaryText}>
              {periodState(selectedPeriod.percentage)} · {selectedPeriod.unlocked}/
              {selectedPeriod.total} · Unlock level {selectedPeriod.unlockLevel}
            </Text>
          </View>
          <Text style={styles.periodSummaryPercent}>{selectedPeriod.percentage}%</Text>
        </View>
        <ProgressBar value={selectedPeriod.percentage / 100} color={colors.primary} />
        {selectedPeriod.percentage >= PERIOD_MASTERY_RATIO * 100 && (
          <Button
            label={
              store.progress.claimedPeriodMastery.includes(selectedPeriod.id)
                ? 'Period Mastery claimed'
                : 'Claim Period Mastery · 150 Gold + 10 Wild Shards'
            }
            disabled={store.progress.claimedPeriodMastery.includes(selectedPeriod.id)}
            onPress={() => store.claimPeriodMastery(selectedPeriod.id)}
          />
        )}
      </View>
      <View style={styles.shop}>
        <View style={styles.rowBetween}>
          <View>
            <Eyebrow>SHOP</Eyebrow>
            <Text style={styles.shopHint}>Characters, shards, boosters and daily rewards.</Text>
          </View>
          <Text style={styles.rotate}>↻ {t(store.uiLanguage, 'shopRotates')}</Text>
        </View>
        <View style={styles.dailyFree}>
          <Text style={styles.resourceIcon}>{dailyFree.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.resourceName}>Daily free · {dailyFree.label}</Text>
            <Text style={styles.resourceOwned}>One free reward every day</Text>
          </View>
          <Pressable
            disabled={dailyClaimed}
            onPress={store.claimDailyFree}
            style={[styles.buy, dailyClaimed && { opacity: 0.4 }]}
          >
            <Text style={styles.buyText}>{dailyClaimed ? 'Claimed' : 'Free'}</Text>
          </Pressable>
        </View>
        <Eyebrow>{t(store.uiLanguage, 'shardShop').toUpperCase()}</Eyebrow>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.offers}
        >
          {shopOffers.map((character) => (
            <View
              key={character.id}
              style={[styles.offer, { borderColor: rarityColors[character.rarity] }]}
            >
              {character.image ? (
                <Image source={character.image} style={styles.offerImage} />
              ) : (
                <View style={[styles.offerImage, styles.portraitPlaceholder]}>
                  <Text style={styles.portraitPlaceholderText}>
                    {biblePeriods[character.period - 1]!.icon}
                  </Text>
                </View>
              )}
              <Text numberOfLines={1} style={styles.offerName}>
                {character.names[store.uiLanguage]}
              </Text>
              <Text style={[styles.offerRarity, { color: rarityColors[character.rarity] }]}>
                {t(store.uiLanguage, character.rarity).toUpperCase()}
              </Text>
              <Text style={styles.offerShards}>
                🧩 {store.progress.characterShards[character.id] ?? 0}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t(store.uiLanguage, 'buyShards')} ${character.names[store.uiLanguage]}`}
                disabled={store.progress.gold < 500}
                onPress={() => store.buyCharacterShards(character.id)}
                style={[styles.buy, store.progress.gold < 500 && { opacity: 0.4 }]}
              >
                <Text style={styles.buyText}>🪙 500 · +5</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <View>
          <Eyebrow>RESOURCES</Eyebrow>
          <Text style={styles.shopHint}>Boosters, Wild Shards and Streak Freezes.</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.offers}
        >
          {resourceShopOffers.map((offer) => {
            const boosterType =
              offer.item.type === 'xpBooster' || offer.item.type === 'goldBooster'
                ? offer.item.type
                : null;
            const duration = 'durationMinutes' in offer.item ? offer.item.durationMinutes : null;
            const count =
              boosterType && duration
                ? (store.progress[boosterType === 'xpBooster' ? 'xpBoosters' : 'goldBoosters'][
                    String(duration)
                  ] ?? 0)
                : 0;
            return (
              <View key={offer.id} style={styles.resourceOffer}>
                <Text style={styles.resourceIcon}>{offer.icon}</Text>
                <Text style={styles.resourceName}>{offer.label}</Text>
                {boosterType && <Text style={styles.resourceOwned}>Owned: {count}</Text>}
                <Pressable
                  disabled={store.progress.gold < offer.price}
                  onPress={() => store.buyShopItem(offer.item)}
                  style={[styles.buy, store.progress.gold < offer.price && { opacity: 0.4 }]}
                >
                  <Text style={styles.buyText}>🪙 {offer.price}</Text>
                </Pressable>
                {boosterType && duration && count > 0 && (
                  <Pressable
                    onPress={() => store.activateBooster(boosterType, duration)}
                    style={[styles.buy, styles.activate]}
                  >
                    <Text style={styles.buyText}>Activate</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.filters}>
        {(['all', 'common', 'rare', 'epic', 'legendary'] as Filter[]).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item }}
            onPress={() => setFilter(item)}
            style={[styles.filter, filter === item && styles.filterActive]}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
              {t(store.uiLanguage, item)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.grid}>
        {visible.map((character) => {
          const shards = store.progress.characterShards[character.id] ?? 0;
          const unlocked = shards >= character.unlockCost;
          const active = store.progress.targetCharacter === character.id;
          const level = characterLevel(shards, character.unlockCost);
          return (
            <Pressable
              key={character.id}
              accessibilityRole="button"
              accessibilityLabel={character.names[store.uiLanguage]}
              onPress={() => setSelected(character.id)}
              style={({ pressed }) => [
                styles.card,
                { borderColor: rarityColors[character.rarity] },
                pressed && { opacity: 0.86 },
              ]}
            >
              <View style={styles.imageWrap}>
                {character.image ? (
                  <Image source={character.image} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardImage, styles.portraitPlaceholder]}>
                    <Text style={styles.portraitPlaceholderText}>
                      {biblePeriods[character.period - 1]!.icon}
                    </Text>
                  </View>
                )}
                {!unlocked && (
                  <View style={styles.lock}>
                    <Ionicons name="lock-closed" size={18} color={colors.white} />
                  </View>
                )}
                {active && (
                  <View style={styles.target}>
                    <Ionicons name="locate" size={15} color={colors.white} />
                  </View>
                )}
                {level > 0 && (
                  <View style={styles.cardLevel}>
                    <Text style={styles.cardLevelText}>Lv.{level}</Text>
                  </View>
                )}
              </View>
              <Text numberOfLines={1} style={styles.cardName}>
                {character.names[store.uiLanguage]}
              </Text>
              <Text style={[styles.cardRarity, { color: rarityColors[character.rarity] }]}>
                {t(store.uiLanguage, character.rarity).toUpperCase()}
              </Text>
              <View style={styles.shardRow}>
                <Text style={styles.shardCount}>
                  🧩 {shards}/
                  {level >= 1 ? character.unlockCost * (level + 1) : character.unlockCost}
                </Text>
              </View>
              <ProgressBar
                value={
                  level >= 4
                    ? 1
                    : shards /
                      (level >= 1 ? character.unlockCost * (level + 1) : character.unlockCost)
                }
                color={rarityColors[character.rarity]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 17 },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    backgroundColor: '#35205D',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#D0A64D',
    borderRadius: radius.lg,
    padding: 17,
  },
  logo: { fontSize: 12, fontWeight: '900', color: '#F2CB65', letterSpacing: 2 },
  title: { fontSize: 28, fontWeight: '900', color: colors.white, marginTop: 4 },
  subtitle: { fontSize: 13, color: '#D8CFEB', marginTop: 4 },
  gold: {
    backgroundColor: '#F2CB65',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: '#9A6C1F',
  },
  goldText: { fontWeight: '900', color: '#2B1C3F' },
  periodSection: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 14,
    gap: 12,
  },
  periods: { gap: 8 },
  periodCard: {
    width: 118,
    minHeight: 104,
    padding: 10,
    gap: 5,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  periodCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  disabledPeriod: { opacity: 0.42 },
  periodIcon: { fontSize: 21 },
  periodName: { minHeight: 30, fontSize: 11, lineHeight: 14, fontWeight: '900', color: colors.ink },
  periodPercent: { fontSize: 12, fontWeight: '900', color: colors.primary },
  periodSummary: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  periodSummaryTitle: { fontSize: 16, fontWeight: '900', color: colors.ink },
  periodSummaryText: { marginTop: 3, fontSize: 11, color: colors.muted },
  periodSummaryPercent: { fontSize: 20, fontWeight: '900', color: colors.primary },
  shop: {
    backgroundColor: '#FFF1CA',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#C99A3D',
    borderRadius: radius.lg,
    padding: 15,
    gap: 13,
  },
  shopHint: { fontSize: 12, color: colors.inkSoft, marginTop: 4, maxWidth: 340 },
  dailyFree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rotate: { fontSize: 10, color: colors.muted, maxWidth: 110, textAlign: 'right' },
  offers: { gap: 8 },
  offer: {
    width: 102,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 8,
    gap: 4,
    borderWidth: 2,
  },
  offerImage: { width: 56, height: 66, borderRadius: radius.sm, alignSelf: 'center' },
  offerName: { fontSize: 12, fontWeight: '900', color: colors.ink },
  offerRarity: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  offerShards: { fontSize: 10, color: colors.muted },
  resourceOffer: {
    width: 126,
    minHeight: 146,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 10,
    gap: 7,
    borderWidth: 1,
    borderColor: colors.line,
  },
  resourceIcon: { fontSize: 25 },
  resourceName: {
    minHeight: 31,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    color: colors.ink,
  },
  resourceOwned: { fontSize: 10, color: colors.muted },
  activate: { backgroundColor: colors.primary, borderColor: '#3F2485' },
  buy: {
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderColor: '#765215',
  },
  buyText: { fontSize: 10, fontWeight: '900', color: colors.white },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filter: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '800', color: colors.muted },
  filterTextActive: { color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    width: '48%',
    flexGrow: 1,
    maxWidth: 210,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: 10,
    gap: 5,
  },
  imageWrap: { position: 'relative', width: 74, height: 88, alignSelf: 'center' },
  cardImage: { width: 74, height: 88, borderRadius: radius.sm },
  portraitPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  portraitPlaceholderText: { fontSize: 30 },
  lock: {
    position: 'absolute',
    right: -7,
    top: -7,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(23,22,47,.84)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  target: {
    position: 'absolute',
    left: -7,
    top: -7,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLevel: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cardLevelText: { fontSize: 9, fontWeight: '900', color: colors.white },
  cardName: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.ink,
    marginTop: 2,
    textAlign: 'center',
  },
  cardRarity: { fontSize: 9, fontWeight: '900', letterSpacing: 0.7, textAlign: 'center' },
  shardRow: { flexDirection: 'row', justifyContent: 'center' },
  shardCount: { fontSize: 10, fontWeight: '800', color: colors.inkSoft },
  detailPage: { padding: 22, gap: 16, maxWidth: 620, width: '100%', alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  backText: { fontWeight: '800', color: colors.ink },
  heroFrame: {
    alignSelf: 'center',
    width: '58%',
    maxWidth: 220,
    borderWidth: 4,
    borderRadius: radius.lg,
    padding: 5,
    backgroundColor: colors.white,
  },
  heroImage: { width: '100%', aspectRatio: 0.84, borderRadius: radius.md },
  rarityBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  rarityBadgeText: { fontSize: 9, fontWeight: '900', color: colors.white, letterSpacing: 1 },
  levelBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.ink,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  levelBadgeText: { fontSize: 10, fontWeight: '900', color: colors.white },
  detailName: { fontSize: 30, fontWeight: '900', textAlign: 'center', color: colors.ink },
  periodTag: { fontSize: 12, fontWeight: '800', textAlign: 'center', color: colors.primary },
  lockedNotice: {
    padding: 11,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.inkSoft,
  },
  detailDescription: { fontSize: 15, lineHeight: 23, textAlign: 'center', color: colors.inkSoft },
  progressCard: {
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 16,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: { fontSize: 16, fontWeight: '900', color: colors.ink },
  stateText: { fontSize: 12, fontWeight: '900' },
  levelHint: { fontSize: 11, color: colors.muted },
  infoCard: { gap: 8, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 16 },
  books: { fontSize: 16, fontWeight: '900', color: colors.ink },
  refs: { fontSize: 13, color: colors.inkSoft },
});
