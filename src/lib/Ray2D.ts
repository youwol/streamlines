import { vec } from '@youwol/math'
import { createV2 } from './utils'

// A ray in 2D
export class Ray2D {
    private dir_ = createV2()
    private orig_ = createV2()
    private valid_ = false

    get origin() {
        return this.orig_
    }
    get direction() {
        return this.dir_
    }
    get valid() {
        return this.valid_
    }

    constructor(origin: vec.Vector2, direction: vec.Vector2) {
        this.orig_ = vec.clone(origin) as vec.Vector2
        this.dir_ = vec.clone(direction) as vec.Vector2
        this.valid_ = true
        if (vec.norm(this.dir_) === 0) {
            this.valid_ = false
        } else {
            this.dir_ = vec.normalize(this.dir_) as vec.Vector2
        }
    }

    intersectRay(
        other: Ray2D,
        intersection: vec.Vector2,
        distances: { dist: number; other_dist: number },
    ): boolean {
        if (this.valid_ === false) return false

        const e = this.dir_[0]
        const f = this.dir_[1]
        const g = other.direction[0]
        const h = other.direction[1]
        const dot = g * f - e * h
        if (Math.abs(dot) < 1e-6) {
            // The two rays are parallel !
            return false
        }
        const a = this.orig_[0]
        const b = this.orig_[1]
        const c = other.origin[0]
        const d = other.origin[1]
        const k2 = (e * (d - b) + f * (a - c)) / dot
        let k1: number
        if (Math.abs(e) > 1e-6) {
            k1 = (c + k2 * g - a) / e
        } else {
            k1 = (d + k2 * h - b) / f
        }

        if (k1 < 0 || k2 < 0) {
            return false
        }

        distances.dist = k1
        distances.other_dist = k2

        intersection[0] = a + k1 * e
        intersection[0] = b + k1 * f

        return true
    }
}
