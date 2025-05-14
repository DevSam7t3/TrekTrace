import { Database, Model } from '@nozbe/watermelondb';
import { children, date, field, text } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export default class Hike extends Model {
  static table = 'hikes';

  constructor(database: Database, rawData: any) {
    super(database, rawData);
    this.name = rawData.name;
    this.startedAt = new Date(rawData.started_at);
    this.finishedAt = rawData.finished_at ? new Date(rawData.finished_at) : undefined;
    this.distance = rawData.distance;
    this.duration = rawData.duration;
    this.elevationGain = rawData.elevation_gain;
    this._isDraft = rawData.is_draft;
    this._isSynced = rawData.is_synced;
    this._isImported = rawData.is_imported;
    this.createdAt = new Date(rawData.created_at);
    this.updatedAt = new Date(rawData.updated_at);
  }

  name!: string;
  startedAt!: Date;
  finishedAt?: Date;
  static associations: Associations = {
    track_points: { type: 'has_many', foreignKey: 'hike_id' }
  };

  @text('name') name!: string;
  @date('started_at') startedAt!: Date;
  @date('finished_at') finishedAt?: Date;
  @field('distance') distance?: number;
  @field('duration') duration?: number;
  @field('elevation_gain') elevationGain?: number;

  @field('is_draft') _isDraft!: number;
  @field('is_synced') _isSynced!: number;
  @field('is_imported') _isImported?: number;

  createdAt!: Date;
  updatedAt!: Date;

  distance?: number;
  duration?: number;
  elevationGain?: number;
  _isDraft!: number;
  _isSynced!: number;
  _isImported?: number;

  @children('track_points') trackPoints: any;
  // Boolean accessors
  get isDraft(): boolean {
    return this._isDraft === 1;
  }
  set isDraft(val: boolean) {
    this._isDraft = val ? 1 : 0;
  }

  get isSynced(): boolean {
    return this._isSynced === 1;
  }
  set isSynced(val: boolean) {
    this._isSynced = val ? 1 : 0;
  }

  get isImported(): boolean {
    return this._isImported === 1;
  }
  set isImported(val: boolean) {
    this._isImported = val ? 1 : 0;
  }

  // Calculated properties
  get isActive(): boolean {
    return this.isDraft && !this.finishedAt;
  }

  get formattedDuration(): string {
    if (!this.duration) return '0:00:00';

    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = Math.floor(this.duration % 60);

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  get formattedDistance(): string {
    if (!this.distance) return '0.0 km';
    return `${(this.distance / 1000).toFixed(2)} km`;
  }

  get formattedElevationGain(): string {
    if (!this.elevationGain) return '0 m';
    return `${Math.round(this.elevationGain)} m`;
  }
}
