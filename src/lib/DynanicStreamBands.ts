import { Serie } from "@youwol/dataframe"
import { vec } from "@youwol/math"
import { BBox, FieldAndNormalAt, FieldAt, Vector } from "./types"
import { inside } from "./utils"

/**
 * Generate dynalically streambands given a field function.
 * @see DynanicStreamLines
 */
export class DynanicStreamBands {
    private bbox     : BBox     = undefined
    private fieldAt  : FieldAndNormalAt  = undefined
    private dt       : number   = undefined
    private maxPoints: number   = undefined
    private width    : number   = undefined
    
    constructor(
        {bbox, fieldAt, dt, maxPoints = 100, width}:
        {bbox: BBox, fieldAt: FieldAndNormalAt, dt?: number, maxPoints?: number, width: number}
    ) {
        this.bbox      = bbox
        this.fieldAt   = fieldAt
        this.maxPoints = maxPoints
        this.width     = width

        if (dt === undefined) {
            const m = Math.max(bbox[3]-bbox[0], bbox[4]-bbox[1], bbox[5]-bbox[2])
            this.dt = m / 500
        }
        else (
            this.dt = dt
        )
    }

    /**
     * Get a streamband composed of consecutive points starting at [[seed]]
     */
    generate(seed: Vector): {positions: Serie, indices: Serie} {
        let nbPoints = 0
        let C = [...seed] as Vector // current point
        let positions: number[] = [...seed]
        let indices  : number[] = []
        // let index: number = 0
        let i: number = 0

        let prevA: vec.Vector3 = undefined

        /*
            C     P1     P2
            *-----*------*
            |   / |
            | /   |
            *-----*
            A1    A2

            Triangles:
            - C,P1,A1
            - P1,P2,A2 + P1,A2,A1
            - P2,P3,A3 + P2,A3,A2
            - ...
            - last one of the band to be done...
        */

        while (nbPoints < this.maxPoints) {
            const {field, normal} = this.fieldAt (C)
            const P = field
            const n = normal
            
            const x = P[0]
            const y = P[1]
            const z = P[2]

            const l = Math.sqrt(x**2 + y**2 + z**2)
            P[0] = x/l*this.dt + C[0]
            P[1] = y/l*this.dt + C[1]
            P[2] = z/l*this.dt + C[2]

            if (inside(this.bbox, P, 1e-7) === false) {
                break
            }

            const CP = vec.create(C, P) as vec.Vector3
            const CA = vec.scale(vec.normalize( vec.cross(CP, n) ), this.width)
            const A = [CA[0]+C[0], CA[1]+C[1], CA[2]+C[2]]

            positions.push(...P)
            positions.push(...A)
        
            if (prevA !== undefined) {
                indices.push(2*i-1, 2*i+1, 2*i+2)
                indices.push(2*i-1, 2*i+2, 2*i)
            }
            else {
                indices.push(0, 1, 2)
            }

            C[0] = P[0]
            C[1] = P[1]
            C[2] = P[2]

            prevA = [...A] as vec.Vector3

            nbPoints++
            i++
        }

        return {
            positions: Serie.create({array: positions, itemSize: 3}),
            indices  : Serie.create({array: indices  , itemSize: 3})
        }
    }
}
