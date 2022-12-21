import { vec } from '@youwol/math'
import { Ray } from './Ray'
import { createV2, createV3, setV2, setV3 } from './utils'
// See also https://github.com/vanruesc/math-ds/tree/master/src

export enum Position {
    SIDE_A,
    SIDE_B,
    COPLANAR,
}

const orient3dfast = (
    pa: Array<number>,
    pb: Array<number>,
    pc: Array<number>,
    pd: Array<number>,
) => {
    let adx, bdx, cdx
    let ady, bdy, cdy
    let adz, bdz, cdz

    adx = pa[0] - pd[0]
    bdx = pb[0] - pd[0]
    cdx = pc[0] - pd[0]
    ady = pa[1] - pd[1]
    bdy = pb[1] - pd[1]
    cdy = pc[1] - pd[1]
    adz = pa[2] - pd[2]
    bdz = pb[2] - pd[2]
    cdz = pc[2] - pd[2]

    return (
        adx * (bdy * cdz - bdz * cdy) +
        bdx * (cdy * adz - cdz * ady) +
        cdx * (ady * bdz - adz * bdy)
    )
}

export class Plane {
    private m_normal: vec.Vector3 = undefined
    private m_p1: vec.Vector3 = undefined
    private m_p2: vec.Vector3 = undefined
    private m_p3: vec.Vector3 = undefined
    private m_d = 0
    private tol_ = 1e-6

    constructor(p1: vec.Vector3, p2: vec.Vector3, p3: vec.Vector3) {
        this.set(p1, p2, p3)
    }

    set(p1: vec.Vector3, p2: vec.Vector3, p3: vec.Vector3): Plane {
        this.m_p1 = vec.clone(p1) as vec.Vector3
        this.m_p2 = vec.clone(p2) as vec.Vector3
        this.m_p3 = vec.clone(p3) as vec.Vector3
        const d1 = vec.sub(this.m_p2, this.m_p1) as vec.Vector3
        const d2 = vec.sub(this.m_p3, this.m_p1) as vec.Vector3
        this.m_normal = vec.normalize(vec.cross(d1, d2)) as vec.Vector3
        this.m_d =
            -(this.m_normal[0] * this.m_p1[0]) -
            this.m_normal[1] * this.m_p1[1] -
            this.m_normal[2] * this.m_p1[2]
        return this
    }

    static fromPointAndNormal(p: vec.Vector3, normal: vec.Vector3): Plane {
        const x = normal[0]
        const y = normal[1]
        const z = normal[2]

        let vec2 = createV3()
        if (Math.abs(y) > 1e-3) {
            vec2 = vec.normalize(
                setV3(vec2, -y, x - (z * z) / y, z),
            ) as vec.Vector3
            // vec2.set(-y, x-((z*z)/y), z).normalize()
        } else if (Math.abs(x) > 1e-3) {
            vec2 = vec.normalize(
                setV3(vec2, y - (z * z) / x, -x, z),
            ) as vec.Vector3
            // vec2.set(y-((z*z)/x), -x, z).normalize()
        } else if (Math.abs(z) > 1e-3) {
            vec2 = vec.normalize(
                setV3(vec2, x, -z, y - (x * x) / z),
            ) as vec.Vector3
            // vec2.set(x, -z, y-((x*x)/z)).normalize()
        } else {
            throw new Error('Error in creating a Plane from point and normal')
        }

        const vec3 = vec.cross(vec2, normal)
        return new Plane(
            p,
            vec.add(p, vec2) as vec.Vector3,
            vec.add(p, vec3) as vec.Vector3,
        )
    }

    clone(): Plane {
        return new Plane(this.m_p1, this.m_p2, this.m_p3)
    }

    get normal(): vec.Vector3 {
        return this.m_normal
    }

    get point(): vec.Vector3 {
        return this.m_p1
    }

    get points(): any {
        return {
            p1: this.m_p1,
            p2: this.m_p2,
            p3: this.m_p3,
        }
    }

    flipOrientation(): Plane {
        const p2 = vec.clone(this.m_p2) as vec.Vector3
        this.m_p2 = this.m_p3
        this.m_p3 = p2
        this.m_normal = vec.scale(this.m_normal, -1) as vec.Vector3
        this.m_d =
            -(this.m_normal[0] * this.m_p1[0]) -
            this.m_normal[1] * this.m_p1[1] -
            this.m_normal[2] * this.m_p1[2]
        return this
    }

    position(p: vec.Vector3): Position {
        //throw new Error('TODO...')

        const val = orient3dfast(this.m_p1, this.m_p2, this.m_p3, p)
        if (val < 0) {
            return Position.SIDE_A
        }
        if (val > 0) {
            return Position.SIDE_B
        }
        return Position.COPLANAR
    }

    setTolerence(d: number) {
        this.tol_ = d
    }

    getNorm(): number {
        const x = vec.sub(this.m_p2, this.m_p1)
        return vec.norm(x)
    }

    toUV(
        p: vec.Vector3,
        result: vec.Vector2,
        normalize_coords?: boolean,
    ): boolean {
        if (normalize_coords === undefined) {
            return this.toUVFromVector(p, result)
        }

        let x = vec.sub(this.m_p2, this.m_p1) as vec.Vector3
        const xn = vec.norm(x)
        if (xn === 0) {
            return false
        }
        x = vec.normalize(x) as vec.Vector3

        const z = vec.clone(this.m_normal) as vec.Vector3
        let y = vec.cross(z, x) as vec.Vector3
        y = vec.normalize(y) as vec.Vector3

        const P = vec.sub(p, this.m_p1)
        if (normalize_coords === true) {
            setV2(result, vec.dot(x, P) / xn, vec.dot(y, P) / xn)
            // result.set(x.dot(P)/xn, y.dot(P)/xn)
        } else {
            setV2(result, vec.dot(x, P), vec.dot(y, P))
            // result.set(x.dot(P), y.dot(P))
        }

        return true
    }

    // TODO Check
    fromUV(
        uv: vec.Vector2,
        result: vec.Vector3,
        normalized_coords = true,
    ): boolean {
        const z = vec.clone(this.m_normal) as vec.Vector3

        let x = vec.create(this.m_p1, this.m_p2) as vec.Vector3
        const xn = vec.norm(x)
        if (xn === 0) {
            return false
        }
        x = vec.normalize(x) as vec.Vector3

        let y = vec.cross(z, x) as vec.Vector3
        y = vec.normalize(y) as vec.Vector3

        let u: number, v: number
        if (normalized_coords === true) {
            u = uv[0] / xn
            v = uv[1] / xn
        } else {
            u = uv[0]
            v = uv[1]
        }

        x = vec.scale(x, u) as vec.Vector3
        y = vec.scale(y, v) as vec.Vector3
        x = vec.add(x, y) as vec.Vector3
        x = vec.add(x, this.m_p1) as vec.Vector3
        result = createV3(x)
        // result.set(x)

        // Check coplanarity
        const in_plane = this.inPlane(result)
        if (in_plane === false) {
            return false // ERROR Points not co-planars
        }

        return true
    }

    project(p: vec.Vector3, result?: vec.Vector3): number {
        if (result === undefined) {
            // return this.projectVector(p)
            result = this.projectVector(p)
        }
        if (this.position(p) === Position.COPLANAR) {
            setV3(result, p[0], p[1], p[2])
            return 0
        }

        const n = vec.clone(this.m_normal) as vec.Vector3
        const up = new Ray(p, n)
        const i_up = up.intersectPlane(this.m_p1, this.m_p2, this.m_p3)
        if (i_up.id == 1) {
            result = createV3(i_up.point)
            return vec.norm(vec.create(p, result))
        } else if (i_up.id == -1) {
            // colinearity
            return -1
        }

        const down = new Ray(p, vec.scale(n, -1) as vec.Vector3)
        const i_down = down.intersectPlane(this.m_p1, this.m_p2, this.m_p3)

        if (i_down.id == 1) {
            result = createV3(i_down.point)
            return vec.norm(vec.create(p, result))
        } else {
            // colinearity
            return -1
        }
    }

    inPlane(pt: vec.Vector3): boolean {
        const p12 = vec.create(this.m_p1, this.m_p2) as vec.Vector3
        const p13 = vec.create(this.m_p1, this.m_p3) as vec.Vector3
        const p23 = vec.create(this.m_p2, this.m_p3) as vec.Vector3
        const n = vec.cross(p12, p13)
        const mean_length_sq =
            (vec.norm2(p12) + vec.norm2(p13) + vec.norm2(p23)) / 3
        const dot = vec.dot(n, vec.create(this.m_p1, pt))
        const dot_sq = dot * dot
        if (dot >= 0) {
            const signed_distance_sq = dot_sq / vec.norm2(n)
            return signed_distance_sq / mean_length_sq < 1e-12
        } else {
            const signed_distance_sq = -dot_sq / vec.norm2(n)
            return -signed_distance_sq / mean_length_sq < 1e-12
        }
    }

    private toUVFromVector(v: vec.Vector3, result: vec.Vector2): boolean {
        const projected_vector = this.projectVector(v)
        const p1_uv = createV2()

        const r1 = this.toUV(this.m_p1, p1_uv, false)
        const p1_plus_projected_vector = vec.add(
            vec.clone(this.m_p1),
            projected_vector,
        ) as vec.Vector3
        const p1_plus_projected_vector_uv = createV2()
        const r2 = this.toUV(
            p1_plus_projected_vector,
            p1_plus_projected_vector_uv,
            false,
        )
        const r = vec.create(p1_uv, p1_plus_projected_vector_uv) as vec.Vector2
        result = createV2(r)
        return r1 && r2
    }

    private projectVector(p: vec.Vector3): vec.Vector3 {
        const fist = createV3()
        const second = vec.clone(p) as vec.Vector3
        const first_projected = createV3()
        const second_projected = createV3()
        this.project(fist, first_projected)
        this.project(second, second_projected)
        return vec.create(first_projected, second_projected) as vec.Vector3
    }
}
