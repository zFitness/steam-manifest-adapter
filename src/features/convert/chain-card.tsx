import { Card, Select } from 'heroui-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import {
  ChainArrowIcon,
  SourceDeviceIcon,
  TargetWindowIcon,
} from '@/features/convert/chain-icons';
import { useTranslate } from '@/i18n/provider';

/** The only supported source today. */
const SOURCE_VALUE = 'gaishi';
/** The only supported target today. */
const TARGET_VALUE = 'winnative';

function ChainBlock({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="flex-1 gap-1.5 rounded-xl bg-background p-2.5">
      <Text className="text-[11px] text-muted-tertiary">{label}</Text>
      <View className="items-center gap-1.5">
        <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-surface">
          {icon}
        </View>
        {children}
      </View>
    </View>
  );
}

/**
 * Conversion chain card (board 2:482): which platform the games come from and
 * which one they are being adapted for.
 *
 * Both pickers use `presentation="popover"`; `@gorhom/bottom-sheet` is not
 * installed, so the sheet-backed presentations would fail at runtime only.
 */
export function ChainCard() {
  const t = useTranslate();
  // SVG strokes need literal colours, so these tokens are read rather than
  // applied as classes like everything else.
  const accent = String(useCSSVariable('--accent') ?? '#5B5FEF');
  const mutedTertiary = String(useCSSVariable('--muted-tertiary') ?? '#747584');

  return (
    <Card className="gap-2.5 rounded-2xl border border-border bg-surface p-4">
      <Text className="text-xs text-muted">{t('convert.chain.label')}</Text>

      <View className="flex-row items-center gap-2">
        <ChainBlock
          label={t('convert.chain.source')}
          icon={<SourceDeviceIcon color={accent} />}
        >
          <Select
            value={{ value: SOURCE_VALUE, label: t('convert.platform.gaishi') }}
            onValueChange={() => {}}
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
                <Select.Item
                  value={SOURCE_VALUE}
                  label={t('convert.platform.gaishi')}
                />
              </Select.Content>
            </Select.Portal>
          </Select>
        </ChainBlock>

        <View className="h-7 w-7 items-center justify-center">
          <ChainArrowIcon color={mutedTertiary} size={28} />
        </View>

        <ChainBlock
          label={t('convert.chain.target')}
          icon={<TargetWindowIcon color={accent} />}
        >
          <Select
            value={{ value: TARGET_VALUE, label: t('convert.platform.winnative') }}
            onValueChange={() => {}}
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
                <Select.Item
                  value={TARGET_VALUE}
                  label={t('convert.platform.winnative')}
                />

                {/* GameNative is not supported yet. The primitive's Item has no
                    disabled state, so this is a plain row with no handler — the
                    reason is spelled out in words, not conveyed by opacity. */}
                <View
                  accessibilityRole="text"
                  className="flex-row items-center justify-between gap-2 px-3 py-2.5 opacity-50"
                >
                  <Text className="text-[13px] text-foreground">
                    {t('convert.platform.gamenative')}
                  </Text>
                  <Text className="text-[11px] text-muted">
                    {t('convert.chain.unsupported')}
                  </Text>
                </View>
              </Select.Content>
            </Select.Portal>
          </Select>
        </ChainBlock>
      </View>
    </Card>
  );
}
