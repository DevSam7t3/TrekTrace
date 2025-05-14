import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'hikes',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'started_at', type: 'number' },
        { name: 'finished_at', type: 'number', isOptional: true },
        { name: 'distance', type: 'number', isOptional: true },
        { name: 'duration', type: 'number', isOptional: true },
        { name: 'elevation_gain', type: 'number', isOptional: true },
        { name: 'is_draft', type: 'boolean' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'is_imported', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'track_points',
      columns: [
        { name: 'hike_id', type: 'string', isIndexed: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'altitude', type: 'number', isOptional: true },
        { name: 'timestamp', type: 'number' },
        { name: 'is_resting', type: 'boolean', isOptional: true },
        { name: 'speed', type: 'number', isOptional: true },
        { name: 'heading', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});