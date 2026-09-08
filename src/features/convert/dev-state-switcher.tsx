import { Button } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import type { ConvertStatus } from '@/features/convert/convert-state';

const ALL_STATUSES: ConvertStatus[] = [
  'no-directory',
  'scanning',
  'scanned-has-adaptable',
  'scanned-empty',
  'scan-failed',
  'permission-revoked',
  'converting',
  'converted',
];

/**
 * Dev-only switcher for stepping through all eight card states during visual
 * and copy review. Renders nothing in a production build.
 */
export function DevStateSwitcher({
  current,
  onSelect,
}: {
  current: ConvertStatus;
  onSelect: (status: ConvertStatus) => void;
}) {
  if (!__DEV__) {
    return null;
  }

  return (
    <View className="gap-2 rounded-2xl border border-dashed border-border p-3">
      <Text className="text-xs font-semibold text-muted">DEV · card state</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {ALL_STATUSES.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={status === current ? 'primary' : 'outline'}
              onPress={() => onSelect(status)}
            >
              {status}
            </Button>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
