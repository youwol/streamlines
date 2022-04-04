/**
 * Example showing how to use the dynallic stream line generator with Arch
 * 
 * ```js
 * const arch   = require('../../../../../platform/components/arch-node/build/Release/arch')
 * const stream = require('../../dist/@youwol/streamlines')
 * const df     = require('@youwol/dataframe')
 * const math   = require('@youwol/math')
 * const io     = require('@youwol/io')
 * const fs     = require('fs')
 * 
 * const model = new arch.Model()
 * model.setHalfSpace( false )
 * model.setMaterial ( 0.25, 1, 1000 )
 * model.addSurface  ( new arch.Surface([-0.5,-0.5,-1, 0.5,-0.5,-1, 0.5,0.5,0, -0.5,0.5,0], [0,1,2, 0,2,3]) )
 * model.addRemote   ( new arch.UserRemote( (x,y,z) => [0,0.1,0,0,0,-1] ) )
 * const bbox  = model.bounds().map( v => v*2)
 * 
 * const solver   = new arch.Forward(model, 'seidel', 1e-9, 200)
 * solver.run()
 * 
 * const solution = new arch.Solution(model)
 * 
 * const fieldAt = (v) => {
 *     const stress = solution.stressAt(v[0], v[1], v[2])
 *     const {values, vectors} = math.eigen(stress)
 *     const k = 1 // 0, 1 or 2
 *     return [vectors[3*k], vectors[3*k+1], 0] // projected horizontally
 * }
 * 
 * const dyn = new stream.DynanicStreamLines({
 *     bbox, 
 *     fieldAt,
 *     dt: 0.002,
 *     maxPoints: 200
 * })
 * 
 * const streamlines = []
 * const Lx = bbox[3]-bbox[0]
 * const Ly = bbox[4]-bbox[1]
 * const Lz = bbox[5]-bbox[2]
 * const n  = 500
 * for (let i=0; i<n; ++i) {
 *     const x = bbox[0] + Lx * Math.random()
 *     const y = bbox[1] + Ly * Math.random()
 *     const z = bbox[2] + Lz * Math.random()
 *     streamlines.push( dyn.generate([x,y,z]) )
 * }
 * 
 * const dataframes = streamlines.map( s => {
 *     const indices = []
 *     for (let i=0; i<s.count-1; ++i) {
 *         indices.push(i, i+1)
 *     }
 *     return df.DataFrame.create({
 *         series: {
 *             positions: s,
 *             indices: df.Serie.create({array: indices, itemSize: 2})
 *         }
 *     })
 * })
 * 
 * fs.writeFileSync('/Users/fmaerten/data/streamlines/out.pl', io.encodeGocadPL(dataframes), 'utf8')
 * ```
 */
export namespace Example_1 {}
