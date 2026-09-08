import { Card, Select } from 'heroui-native';
import { Image, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { ChainArrowIcon } from '@/features/convert/chain-icons';
import {
  DEFAULT_SOURCE,
  DEFAULT_TARGET,
  SOURCE_PLATFORMS,
  TARGET_PLATFORMS,
  type Platform,
} from '@/features/convert/platforms';
import { useTranslate } from '@/i18n/provider';

/**
 * The platform's own launcher icon, sized for the 36pt tile in `ChainBlock`.
 * `resizeMode="contain"` keeps a square icon square even if a future entry
 * ships different proportions.
 */
function PlatformIcon({
  platform,
  size = 28,
}: {
  platform: Platform;
  size?: number;
}) {
  if (!platform.icon) {
    return null;
  }
  return (
    <Image
      source={platform.icon}
      style={{ width: size, height: size, borderRadius: size / 4 }}
      resizeMode="contain"
      // The label sits right next to the icon, so it carries no extra meaning.
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

function ChainBlock({
  label,
  platform,
  children,
}: {
  label: string;
  platform: Platform;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-1 gap-1.5 rounded-xl bg-background p-2.5">
      <Text className="text-[11px] text-muted-tertiary">{label}</Text>
      <View className="items-center gap-1.5">
        <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] bg-surface">
          <PlatformIcon platform={platform} />
        </View>
        {children}
      </View>
    </View>
  );
}

/**
 * One row inside a picker. Supported platforms are real `Select.Item`s;
 * unsupported ones are inert rows that say why in words, because the
 * primitive's Item has no disabled state and dimming alone is not a reason.
 */
function PlatformOption({ platform }: { platform: Platform }) {
  const t = useTranslate();
  const label = t(platform.labelKey);

  if (!platform.supported) {
    return (
      <View
        accessibilityRole="text"
        className="flex-row items-center justify-between gap-2 px-3 py-2.5 opacity-50"
      >
        <View className="flex-row items-center gap-2">
          <PlatformIcon platform={platform} size={20} />
          <Text className="text-[13px] text-foreground">{label}</Text>
        </View>
        <Text className="text-[11px] text-muted">
          {t('convert.chain.unsupported')}
        </Text>
      </View>
    );
  }

  return (
    <Select.Item value={platform.id} label={label}>
      <View className="flex-row items-center gap-2">
        <PlatformIcon platform={platform} size={20} />
        <Select.ItemLabel />
      </View>
      <Select.ItemIndicator />
    </Select.Item>
  );
}

/**
 * Conversion chain card (board 2:482): which platform the games come from and
 * which one they are being adapted for.
 *
 * The platform list — names and icons — lives in `platforms.ts`; this component
 * only lays it out. Both pickers use `presentation="popover"`;
 * `@gorhom/bottom-sheet` is not installed, so the sheet-backed presentations
 * would fail at runtime only.
 */
export function ChainCard() {
  const t = useTranslate();
  // The SVG arrow needs a literal colour, so this token is read rather than
  // applied as a class like everything else.
  const mutedTertiary = String(useCSSVariable('--muted-tertiary') ?? '#747584');

  return (
    <Card className="gap-2.5 rounded-2xl border border-border bg-surface p-4">
      {/* <Text className="text-xs text-muted">{t('convert.chain.label')}</Text> */}

      <View className="flex-row items-center gap-2">
        <ChainBlock
          label={t('convert.chain.source')}
          platform={DEFAULT_SOURCE}
        >
          <Select
            value={{
              value: DEFAULT_SOURCE.id,
              label: t(DEFAULT_SOURCE.labelKey),
            }}
            onValueChange={() => { }}
          >
            <Select.Trigger className="w-full">
              <Select.Value
                placeholder={t('convert.chain.pickSource')}
                className="text-[13px] font-semibold text-foreground"
              />
            </Select.Trigger>
            <Select.Portal>
              <Select.Overlay />
              <Select.Content presentation="popover">
                {SOURCE_PLATFORMS.map((platform) => (
                  <PlatformOption key={platform.id} platform={platform} />
                ))}
              </Select.Content>
            </Select.Portal>
          </Select>
        </ChainBlock>

        <View className="h-7 w-7 items-center justify-center">
          <ChainArrowIcon color={mutedTertiary} size={28} />
        </View>

        <ChainBlock
          label={t('convert.chain.target')}
          platform={DEFAULT_TARGET}
        >
          <Select
            value={{
              value: DEFAULT_TARGET.id,
              label: t(DEFAULT_TARGET.labelKey),
            }}
            onValueChange={() => { }}
          >
            <Select.Trigger className="w-full">
              <Select.Value
                placeholder={t('convert.chain.pickTarget')}
                className="text-[13px] font-semibold text-foreground"
              />
            </Select.Trigger>
            <Select.Portal>
              <Select.Overlay />
              <Select.Content presentation="popover">
                {TARGET_PLATFORMS.map((platform) => (
                  <PlatformOption key={platform.id} platform={platform} />
                ))}
              </Select.Content>
            </Select.Portal>
          </Select>
        </ChainBlock>
      </View>
    </Card>
  );
}
