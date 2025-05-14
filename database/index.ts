import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import migrations from './migrations';
import Hike from './models/Hike';
import TrackPoint from './models/TrackPoint';
import schema from './schema';

// Initialize database with the SQLite adapter
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'trailtracker',
  jsi: true, // enables JSI (JavaScript Interface) for performance
});

export const database = new Database({
  adapter,
  modelClasses: [
    Hike,
    TrackPoint
  ],
});

export { Hike, TrackPoint };
