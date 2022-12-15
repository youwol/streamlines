import {
    Surface,
    Facet,
    Node,
    Halfedge,
    BBox,
    inflateBBox,
} from '@youwol/geometry'
import { Octree } from './Octree'
import { Plane } from './plane'
import { Ray2D } from './Ray2D'

import { vec, minMax } from '@youwol/math'
import { Serie } from '@youwol/dataframe'
import { createV2, createV3 } from './utils'

/**
 * If seedAttribute is provided (at faces), the seeding points are generated according to
 * the distribution of the seed attributes as well as the minSeed and maxSeed thresholds.
 *
 * @param nodes The 3D nodes as an array of number
 * @param faces The faces indices as an array of number
 * @param fieldAttribute The vector field defined at nodes
 * @param seedAttribute  The scalar attribute defined at faces for seeding.
 * @param integrationStep The number of iterations
 * @param minSeed The minimum threshold value of the normalized seeding attribute (default 0.5)
 * @param maxSeed The maximum threshold value of the normalized seeding attribute (default 1)
 */
export function surfaceStreamlines({
    nodes,
    faces,
    fieldAttribute,
    seedAttribute,
    integrationStep = 1000,
    minSeed = 0.5,
    maxSeed = 1,
    verbose = false,
}: {
    nodes: Serie
    faces: Serie
    fieldAttribute: Serie

    integrationStep?: number

    seedAttribute?: Serie
    minSeed?: number
    maxSeed?: number

    verbose?: boolean
}) {
    const s = new StreamLinesOnSurface()
    return s.generate({
        nodes,
        faces,
        fieldAttribute,
        seedAttribute,
        seedThresholdUp: maxSeed,
        seedThresholdDown: minSeed,
        istep: integrationStep,
        verbose,
    })
}

// -----------------------------------------------------------------------

export class StreamLinesOnSurface {
    private surface: Surface = undefined
    private first_calculus_ = true
    private integStep_ = 0
    private d_sep_ = 0
    private vectorAttr: Serie = undefined
    private seedAttr: Serie = undefined
    private seedThresholdUp = 1
    private seedThresholdDown = 0
    private bbox3_: BBox = undefined
    private ptsOctree_: Octree = undefined
    private borderEdges_: Array<Halfedge> = []
    private curSL: Array<vec.Vector3> = []
    // private solution_: Serie[] = []
    private solution_: number[] = []
    private verbose = false
    //private nodes_octree_: Octree = undefined

    generate({
        verbose = false,
        nodes,
        faces,
        fieldAttribute,
        seedAttribute,
        seedThresholdUp = 1,
        seedThresholdDown = 0.5,
        istep = 1000,
    }: {
        verbose?: boolean
        nodes: Serie
        faces: Serie
        fieldAttribute: Serie
        seedAttribute?: Serie
        seedThresholdUp?: number
        seedThresholdDown?: number
        istep?: number
    }) {
        this.verbose = verbose

        if (this.first_calculus_) {
            this.first_calculus_ = false
            this.surface = Surface.create(nodes, faces)
            const bbox = this.surface.bbox
            this.integStep_ =
                Math.max(bbox.xLength, bbox.yLength, bbox.zLength) / istep
            this.d_sep_ = this.integStep_
            if (this.verbose) {
                console.log('nb nodes', nodes.count)
                console.log('nb faces', faces.count)
                console.log('attribute dim', fieldAttribute.itemSize)
                console.log('bbox', bbox)
                console.log('integration step', this.integStep_)
            }
        }

        if (fieldAttribute !== undefined) {
            this.vectorAttr = fieldAttribute
        } else {
            throw new Error(`Vector field attribute is undefined`)
        }

        // Seed attribute should be defined for faces, not for nodes
        if (seedAttribute !== undefined) {
            this.seedThresholdUp = seedThresholdUp
            this.seedThresholdDown = seedThresholdDown
            this.seedAttr = seedAttribute

            if (this.verbose) {
                console.log('seeed threshold down', this.seedThresholdDown)
                console.log('seeed threshold up  ', this.seedThresholdUp)
            }
        }

        this.run()

        // Hack: Simplify the lines !!!!!!!!!
        console.warn('TODO: decimate the generated lines?')
        // this.solution_ = this.solution_.map( line => simplify(line, 1, true) ) // HAVE TO DEAL WITH THAT SHIT !!!

        return this.solution_
    }

    private run() {
        if (this.vectorAttr === undefined) {
            return
        }

        // ---------------------------------------

        this.borderEdges_ = this.surface.borderEdges
        const nodes: Set<Node> = new Set()
        this.borderEdges_.forEach((e) => {
            nodes.add(e.node)
            nodes.add(e.next.node)
        })
        const b = this.surface.bbox

        // ---------------------------------------

        this.d_sep_ = this.integStep_

        this.bbox3_ = this.surface.bbox
        this.bbox3_.scale(1.2)
        inflateBBox(this.bbox3_)
        const c = this.bbox3_
        this.ptsOctree_ = new Octree(c, 5, 10)

        this.surface.forEachFace((facet: Facet, i: number) => {
            facet['visited'] = false
            facet['skip'] = false
        })

        // TODO: Use an attribute at facet for seeding points...
        /*
        IDEA:
            1) convert nodes attribute to facets
            2) normalize the attribute in [0,1]
            3) if (facet attribute is >= prescribed user threshold value) then generate
            The prescribed user threshold value is in the range [0,1]

            After (2):
            Sort triangles in decreasing order using the threshold values (max and min) and
            put bad triangles as 'skip'=true. All triangles are set as 'visited'=false
        */
        if (this.seedAttr !== undefined) {
            // attr: Normalize the attribute
            let attr = this.seedAttr
            const mm = minMax(attr)
            attr = attr.map((v: number) => (v - mm[0]) / (mm[1] - mm[0]))

            // faces: Sort an array of faced according the attribute
            const faces: Array<Facet> = []
            this.surface.facets.forEach((facet) => {
                faces.push(facet)
            })
            faces.sort((f1, f2) => attr[f2.id] - attr[f1.id])

            // [0, end]: get the the index of the ending element to remove
            // corresponding to the upper threshold
            for (let i = 0; i < faces.length; ++i) {
                const f = faces[i]
                const val = attr[f.id]
                if (
                    val > this.seedThresholdUp ||
                    val < this.seedThresholdDown
                ) {
                    f['skip'] = true
                }
            }
        }

        this.surface.forEachFace((facet: Facet) => {
            if (facet['skip'] === false) {
                this.curSL = []
                this.genOneSL(facet)
                // const lines: Array<vec.Vector3> = []
                const lines = []
                this.curSL.forEach((point) => {
                    if (this.bbox3_.contains(point)) {
                        this.ptsOctree_.addItem(point)
                        lines.push(...point)
                    }
                })
                if (lines.length > 0) {
                    // this.solution_.push(
                    //     Serie.create({array: lines, itemSize: 3})
                    // )
                    this.solution_.push(...lines)
                }
            }
        })

        // ---------------------------------------
    }

    private genOneSL(seedPoly: Facet) {
        if (seedPoly['visited'] === true) {
            return
        }
        seedPoly['visited'] = true

        // compute barycenter
        let barycenter = [0, 0, 0] as vec.Vector3
        const nop = seedPoly.nodes
        nop.forEach((node) => {
            /*vec.add(barycenter,node.posVec3)*/
            barycenter[0] += node.posVec3[0]
            barycenter[1] += node.posVec3[1]
            barycenter[2] += node.posVec3[2]
        })
        barycenter = vec.scale(barycenter, 1 / 3) as vec.Vector3

        // draw the stream line starting from the seed, in the 2 directions
        if (!this.tooNear(barycenter)) {
            this.curSL.push(barycenter)
            this.genSL(barycenter, seedPoly, false)
            this.genSL(barycenter, seedPoly, true)
        }
    }

    private genSL(iP: vec.Vector3, polygon: Facet, reverse: boolean) {
        const nop = polygon.nodes

        const triangle_plane = new Plane(
            nop[0].posVec3,
            nop[1].posVec3,
            nop[2].posVec3,
        )
        const pIP = [0, 0] as vec.Vector2
        if (!triangle_plane.toUV(iP, pIP, false)) {
            return // ERROR no projection found 1
        }

        let hv = [0, 0] as vec.Vector2
        if (!this.projectedVector(pIP, polygon, [0, 0], reverse, true, hv)) {
            return
        }

        hv = vec.scale(vec.normalize(hv), this.integStep_) as vec.Vector2
        const nextPIP = vec.clone(pIP) as vec.Vector2
        hv = vec.add(nextPIP, hv) as vec.Vector2
        const nextIP = [0, 0, 0] as vec.Vector3
        if (!triangle_plane.fromUV(nextPIP, nextIP, false)) {
            return //no projection found ERROR
        }

        if (this.tooNear(iP)) {
            return
        }

        this.curSL.push(iP)
        this.recursiveSL(polygon, iP, nextIP, undefined, reverse, 40)
    }

    private tooNear(iP: vec.Vector3): boolean {
        const min = [
            iP[0] - this.d_sep_,
            iP[1] - this.d_sep_,
            iP[2] - this.d_sep_,
        ] as vec.Vector3
        const max = [
            iP[0] + this.d_sep_,
            iP[1] + this.d_sep_,
            iP[2] + this.d_sep_,
        ] as vec.Vector3
        let tooNear = false
        const items: Array<vec.Vector3> = []
        this.ptsOctree_.getItemsIn(new BBox(min, max), items)

        if (items.length > 0) {
            for (let i = 0; i < items.length; ++i) {
                const dist = vec.norm(vec.create(items[i], iP))
                if (dist < this.d_sep_) {
                    tooNear = true
                    break
                }
            }
        }
        return tooNear
    }

    private recursiveSL(
        polygon: Facet,
        fSP: vec.Vector3,
        sSP: vec.Vector3,
        entryEdge: Halfedge,
        reverse: boolean,
        maxIter: number,
    ): void {
        if (maxIter == 0) {
            return
        }

        polygon['visited'] = true

        const bbox = new BBox(fSP, sSP)
        const comp_bbox = this.surface.bbox
        inflateBBox(comp_bbox)
        comp_bbox.scale(1.02)

        if (
            !comp_bbox.contains(bbox) ||
            this.borderEdges_.includes(entryEdge)
        ) {
            return
        }

        // check if we are very close to a border node
        const nop = polygon.nodes
        const triangle_plane = new Plane(
            nop[0].posVec3,
            nop[1].posVec3,
            nop[2].posVec3,
        )

        //project segment point in triangle space
        const pFSP = [0, 0, 0] as vec.Vector3
        triangle_plane.project(fSP, pFSP)

        const pSSP = [0, 0, 0] as vec.Vector3
        triangle_plane.project(sSP, pSSP)

        const pFSP_uv = [0, 0] as vec.Vector2
        if (!triangle_plane.toUV(pFSP, pFSP_uv, false)) {
            return // ERROR "no projection found
        }
        const pSSP_uv = [0, 0] as vec.Vector2
        if (!triangle_plane.toUV(pSSP, pSSP_uv, false)) {
            return // ERROR no projection found
        }

        const pSV = vec.create(pFSP_uv, pSSP_uv) as vec.Vector2
        const segment = new Ray2D(pFSP_uv, pSV)
        let intersectFound = false

        const edgesOfPoly: Array<Halfedge> = []
        edgesOfPoly.push(
            polygon.halfedge,
            polygon.halfedge.next,
            polygon.halfedge.next.next,
        )
        for (let i = 0; i < edgesOfPoly.length; ++i) {
            const edge = edgesOfPoly[i]
            if (edge != entryEdge) {
                const fNOE = edge.node
                const sNOE = edge.next.node

                const pFP = createV2() as vec.Vector2
                if (!triangle_plane.toUV(fNOE.posVec3, pFP, false)) {
                    return // ERROR no projection found
                }

                const pSP = [0, 0] as vec.Vector2
                if (!triangle_plane.toUV(sNOE.posVec3, pSP, false)) {
                    return // ERROR no projection found
                }

                const pV = vec.create(pFP, pSP) as vec.Vector2

                const curSeg = new Ray2D(pFP, pV)

                const iC = createV2() as vec.Vector2

                const distances = {
                    dist: 0,
                    other_dist: 0,
                }

                if (
                    curSeg.intersectRay(segment, iC, distances) == true &&
                    distances.dist > 0 &&
                    distances.other_dist < vec.norm(pV) &&
                    distances.other_dist > 0 &&
                    distances.other_dist < vec.norm(pSV)
                ) {
                    //console.log(distances)
                    //draw segment with new unprojected intersection point
                    const uIP = [0, 0, 0] as vec.Vector3
                    if (!triangle_plane.fromUV(iC, uIP, false)) {
                        return // ERROR no projection found
                    }
                    if (this.tooNear(uIP)) {
                        return
                    }

                    // Push one segment
                    //this.solution_.push(pFSP, uIP)

                    // const mate_polygon =  wrapper.get_incident_border_polygon(edge, polygon) <------ CHECK HERE
                    // const mate_polygon = edge.opposite.facet
                    const mate_polygon = this.borderPolygon(edge, polygon)
                    if (
                        mate_polygon !== undefined &&
                        mate_polygon['visited'] === false
                    ) {
                        // <--------------- CHECK HERE if we use return ... or not
                        this.recursiveSL(
                            mate_polygon,
                            uIP,
                            pSSP,
                            edge,
                            reverse,
                            maxIter - 1,
                        )
                        //return
                    } else {
                        return
                    }
                    intersectFound = true
                }
            }
        }

        if (!intersectFound) {
            // No intersection found.
            // Launch new recursivity with a new vector
            //this.solution_.push(pFSP, pSSP)

            if (this.tooNear(pSSP)) {
                return
            }

            this.curSL.push(pSSP)
            let pIV = [0, 0] as vec.Vector2
            if (
                !this.projectedVector(
                    pSSP_uv,
                    polygon,
                    pSV,
                    reverse,
                    false,
                    pIV,
                )
            ) {
                return
            }

            pIV = vec.scale(vec.normalize(pIV), this.integStep_) as vec.Vector2
            const projected_next_point = vec.add(
                vec.clone(pSSP_uv),
                pIV,
            ) as vec.Vector2
            const next_point = [0, 0, 0] as vec.Vector3
            if (
                !triangle_plane.fromUV(projected_next_point, next_point, false)
            ) {
                return // ERROR no projection found
            }

            this.recursiveSL(
                polygon,
                pSSP,
                next_point,
                undefined,
                reverse,
                maxIter - 1,
            )
        }
    }

    private borderPolygon(e: Halfedge, polygon: Facet): Facet {
        if (polygon === e.facet) {
            return e.opposite.facet
        } else if (polygon === e.opposite.facet) {
            return e.facet
        } else {
            return undefined
        }
    }

    private projectedVector(
        pIC: vec.Vector2,
        polygon: Facet,
        streamDir: vec.Vector2,
        reverse: boolean,
        first_step: boolean,
        pV: vec.Vector2, // <--- return value as well
    ): boolean {
        const nop = polygon.nodes

        const triangle_plane = new Plane(
            nop[0].posVec3,
            nop[1].posVec3,
            nop[2].posVec3,
        )
        const pp0 = createV2()
        const pp1 = createV2()
        const pp2 = createV2()
        if (!triangle_plane.toUV(nop[0].posVec3, pp0, false)) {
            return false // no projection found
        }
        if (!triangle_plane.toUV(nop[1].posVec3, pp1, false)) {
            return false // no projection found
        }
        if (!triangle_plane.toUV(nop[2].posVec3, pp2, false)) {
            return false // no projection found
        }

        const x1_x0 = pp1[0] - pp0[0]
        const x2_x0 = pp2[0] - pp0[0]
        const y1_y0 = pp1[1] - pp0[1]
        const y2_y0 = pp2[1] - pp0[1]

        const alpha = 1 / (x1_x0 * y2_y0 - x2_x0 * y1_y0)
        const x_x0 = pIC[0] - pp0[0]
        const y_y0 = pIC[1] - pp0[1]
        const etha = alpha * (y2_y0 * x_x0 - x2_x0 * y_y0)
        const ksi = alpha * (x1_x0 * y_y0 - y1_y0 * x_x0)

        const vec0 = createV3(this.vectorAttr[nop[0].id]) //.scale(1e4)
        const vec1 = createV3(this.vectorAttr[nop[1].id]) //.scale(1e4)
        const vec2 = createV3(this.vectorAttr[nop[2].id]) //.scale(1e4)

        const pV0 = createV2()
        const pV1 = createV2()
        const pV2 = createV2()

        if (!triangle_plane.toUV(vec0, pV0)) {
            return false // no projection found
        }
        if (!triangle_plane.toUV(vec1, pV1)) {
            return false // no projection found
        }
        if (!triangle_plane.toUV(vec2, pV2)) {
            return false // no projection found
        }

        if (vec.norm(pV0) === 0 || vec.norm(pV1) === 0 || vec.norm(pV2) === 0) {
            return false
        }

        if (first_step) {
            if (vec.dot(pV0, pV1) < 0) {
                vec.scale(pV1, -1)
            }
            if (vec.dot(pV0, pV2) < 0) {
                vec.scale(pV2, -1)
            }
        }

        if (reverse) {
            vec.scale(pV0, -1)
            vec.scale(pV1, -1)
            vec.scale(pV2, -1)
        }

        if (!first_step) {
            if (streamDir[0] != 0 && streamDir[1] != 0) {
                if (vec.dot(pV0, streamDir) < 0) {
                    vec.scale(pV0, -1)
                }
                if (vec.dot(pV1, streamDir) < 0) {
                    vec.scale(pV1, -1)
                }
                if (vec.dot(pV2, streamDir) < 0) {
                    vec.scale(pV2, -1)
                }
            }
        }

        vec.scale(pV0, 1 - etha - ksi)
        vec.scale(pV1, etha)
        vec.scale(pV2, ksi)

        pV[0] = pV0[0] + pV1[0] + pV2[0]
        pV[1] = pV0[1] + pV1[1] + pV2[1]

        return true
    }
}
