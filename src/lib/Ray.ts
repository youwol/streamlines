import { vec, sub, add } from '@youwol/math'
// See also https://github.com/vanruesc/math-ds/tree/master/src

export class Ray {
    private orig_: vec.Vector3
    private dir_: vec.Vector3
    private valid_ = false

    constructor(origin: vec.Vector3, direction: vec.Vector3) {
        this.orig_ = vec.clone(origin) as vec.Vector3
        this.dir_ = vec.clone(direction) as vec.Vector3

        this.valid_ = true
        if (vec.norm(this.dir_) == 0) this.valid_ = false
        else vec.normalize(this.dir_)
    }

    get origin(): vec.Vector3 {
        return this.orig_
    }
    get direction(): vec.Vector3 {
        return this.dir_
    }
    get valid(): boolean {
        return this.valid_
    }

    intersectPlane(
        p1: vec.Vector3,
        p2: vec.Vector3,
        p3: vec.Vector3,
    ): { id: number; point: vec.Vector3 } {
        if (!this.valid)
            return {
                point: [0, 0, 0],
                id: 0,
            }

        const res = intersectRay3DPlane(this, new Triangle(p1, p2, p3))
        if (res.flag === 1) {
            return {
                id: 1,
                point: res.point,
            }
        }
        return {
            id: res.flag,
            point: [0, 0, 0],
        }
    }
}

// ------------------------------------------------

class Triangle {
    public V0: vec.Vector3
    public V1: vec.Vector3
    public V2: vec.Vector3

    constructor(v0: vec.Vector3, v1: vec.Vector3, v2: vec.Vector3) {
        this.V0 = v0
        this.V1 = v1
        this.V2 = v2
    }
}

function intersectRay3DPlane(
    R: Ray,
    T: Triangle,
): { flag: number; point: vec.Vector3 } {
    const eps = 1e-10 // 1e-15
    const u = vec.sub(T.V1, T.V0) as vec.Vector3
    const v = vec.sub(T.V2, T.V0) as vec.Vector3
    const n = vec.cross(u, v)
    if (vec.norm(n) < eps)
        return {
            point: undefined,
            flag: -1,
        }

    const dir = R.direction
    const w0 = vec.sub(R.origin, T.V0)
    const a = -vec.dot(n, w0)
    const b = vec.dot(n, dir)

    // ray is parallel to triangle plane
    if (Math.abs(b) < eps) {
        if (Math.abs(a) < eps) {
            return {
                point: undefined,
                flag: 2,
            }
        } else {
            return {
                point: undefined,
                flag: 0,
            }
        }
    }

    // get intersect point of ray with triangle plane
    let r = a / b
    if (Math.abs(r) < eps) {
        r = 0
    }
    if (r < 0)
        return {
            point: undefined,
            flag: 0,
        }

    const I = vec.add(R.origin, vec.scale(dir, r)) as vec.Vector3
    return {
        point: I,
        flag: 1,
    }
}
