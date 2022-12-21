import { Serie } from '@youwol/dataframe'
import { BBox, FieldAt, Vector } from './types'
import { inside } from './utils'

/**
 * Generate dynalically streamlines given a field function. Each generated streamline
 * starts at a seed point. Each call to generate will produce a streamline as a [[Serie]]
 *
 * @example
 * We use **Arch** as a field generator. Arch allows to compute, at any 3D point
 * in space, the perturbed stress. In this example, the field is given by $$sigma_2$$.
 * ```js
 * const arch   = require('@youwol/arch')
 * const stream = require('@youwol/streamlines')
 * const math   = require('@youwol/math')
 *
 * const model = new arch.Model()
 * const bbox  = model.bounds()
 * ...
 * const solution = new arch.Solution(model)
 *
 * const fieldAt = (v) => {
 *      const stress = solution.stressAt(v[0], v[1], v[2])
 *      const {values, vectors} = math.eigen(stress)
 *      return [vectors[3], vectors[4], vectors[5]] // $$sigma_2$$
 * }
 *
 * const dyn        = new stream.DynanicStreamLines({bbox, fieldAt})
 * const n          = 10
 * const steamlines = []
 * const z          = (bbox[5]+bbox[2])/2 // middle of the model
 *
 * // Generate evenly spaced seed points (2D grid)
 * const Lx = bbox[3]-bbox[0]
 * const Ly = bbox[4]-bbox[1]
 * for (let i=0; i<n; ++i) {
 *      const x = bbox[0] + Lx * i / (n-1)
 *      for (let j=0; j<n; ++j) {
 *          const y = bbox[1] + Ly * j / (n-1)
 *          streamlines.push( dyn.generate([x,y,z]) )
 *      }
 * }
 *
 * console.log(streamlines)
 * ```
 */
export class DynanicStreamLines {
    private bbox: BBox = undefined
    private fieldAt: FieldAt = undefined
    private dt: number = undefined
    private maxPoints: number = undefined

    constructor({
        bbox,
        fieldAt,
        dt,
        maxPoints = 100,
    }: {
        bbox: BBox
        fieldAt: FieldAt
        dt?: number
        maxPoints?: number
    }) {
        this.bbox = bbox
        this.fieldAt = fieldAt
        this.maxPoints = maxPoints

        if (dt === undefined) {
            const m = Math.max(
                bbox[3] - bbox[0],
                bbox[4] - bbox[1],
                bbox[5] - bbox[2],
            )
            this.dt = m / 500
        } else {
            this.dt = dt
        }
    }

    /**
     * Get a streamline composed of consecutive points starting at [[seed]]
     */
    generate(seed: Vector): Serie {
        let nbPoints = 0
        const points: number[] = [...seed]

        const current = [...seed] as Vector

        while (nbPoints < this.maxPoints) {
            const p = this.fieldAt(current)

            const x = p[0]
            const y = p[1]
            const z = p[2]
            const l = Math.sqrt(x ** 2 + y ** 2 + z ** 2)
            p[0] = (x / l) * this.dt + current[0]
            p[1] = (y / l) * this.dt + current[1]
            p[2] = (z / l) * this.dt + current[2]

            if (inside(this.bbox, p, 1e-7) === false) {
                break
            }

            points.push(...p)

            current[0] = p[0]
            current[1] = p[1]
            current[2] = p[2]
            nbPoints++
        }

        return Serie.create({ array: points, itemSize: 3 })
    }
}
