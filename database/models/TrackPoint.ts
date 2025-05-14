import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, relation, text } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export default class TrackPoint extends Model {
  static table = 'track_points';

  static associations: Associations = {
    hikes: { type: 'belongs_to', key: 'hike_id' }
  };

 @text('hike_id') hikeId!: string
 @field('latitude') latitude!: number
 @field('longitude') longitude!: number
 @field('altitude') altitude?: number
 @date('timestamp') timestamp!: Date

 @field('is_resting') _isResting?: number

 @field('speed') speed?: number
 @field('heading') heading?: number

 @readonly @date('created_at') createdAt!: Date

  constructor(attributes: any) {
    super(attributes);
 this.hikeId = attributes.hikeId;
 // Initialize other fields similarly if needed, although WatermelonDB handles field mapping
  }

  @relation('hikes', 'hike_id') hike: any;

  get isResting(): boolean {
    return this._isResting === 1;
  }

  set isResting(val: boolean) {
    this._isResting = val ? 1 : 0;
  }
}
