import { SqliteRegistryStore } from '../lib/registry/sqlite-store';

async function main() {
  const snapshot = await SqliteRegistryStore.seedFromJson();
  console.log(
    JSON.stringify(
      {
        providers: snapshot.providers.length,
        models: snapshot.models.length,
        modelRoutes: snapshot.modelRoutes.length,
        pricingRecords: snapshot.pricingRecords.length,
        capabilityProfiles: snapshot.capabilityProfiles.length,
        suitabilityProfiles: snapshot.suitabilityProfiles.length,
        integrationMetadata: snapshot.integrationMetadata.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
