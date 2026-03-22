import type { FeatureFlagEntry } from '@chatxiv/cdm';
import { featureFlagEntryPath } from '@chatxiv/cdm';
import { HTTP_METHOD } from '../core/httpMethod';
import { chatxivApiRequest } from './instance';
import type { ChatxivApiRequestOptions } from './types';

export async function fetchFeatureFlagEntry(
  flagName: string,
  options?: ChatxivApiRequestOptions
): Promise<FeatureFlagEntry> {
  return chatxivApiRequest<FeatureFlagEntry>(
    HTTP_METHOD.GET,
    featureFlagEntryPath(flagName),
    options
  );
}
