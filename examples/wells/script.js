const arch   = require('../../../../../platform/components/arch-node/build/Release/arch')
const stream = require('../../dist/@youwol/streamlines')
const df     = require('@youwol/dataframe')
const geom   = require('@youwol/geometry')
const math   = require('@youwol/math')
const io     = require('@youwol/io')
const fs     = require('fs')

const rho     = 1000
const shouift = 0

const filename = '/Users/fmaerten/data/arch/wells/well1.ts'
const well = io.decodeGocadTS( fs.readFileSync(filename, 'utf8'), {repair: true} )[0]
const pos1 = well.series.positions
const pos2 = pos1.map( v => [v[0]+100000, v[1], v[2]] )

const model = new arch.Model()
model.setHalfSpace( false )
model.setMaterial ( 0.25, 1, 1000 )

const well1 = new arch.Surface(pos1.array, well.series.indices.array)
model.addSurface( well1 )
well1.setBC("dip"   , "free", 0)
well1.setBC("strike", "free", 0)
well1.setBC("normal", "free", (x,y,z) => shouift + rho*10*z)

const well2 = new arch.Surface(pos2.array, well.series.indices.array)
model.addSurface( well2 )

const remote = new arch.UserRemote()
remote.setFunction( (x,y,z) => {
    const Z = Math.abs(z)
    return [1*Z, 0.5*Z, 0, 0*Z, 0, 1*Z]
})
model.addRemote( remote )


const bbox  = model.bounds().map( v => v*2)

const solver   = new arch.Forward(model, 'seidel', 1e-9, 200)
solver.setNbCores(10)
solver.run()

const solution = new arch.Solution(model)

const fieldAt = (v) => {
    const stress = solution.stressAt(v[0], v[1], v[2])
    const {values, vectors} = math.eigen(stress)
    const i = 1
    return [vectors[3*i], vectors[3*i+1], vectors[3*i+2]]
}

const dyn = new stream.DynanicStreamLines({
    bbox, 
    fieldAt,
    dt: 0.002,
    maxPoints: 2000
})

const streamlines = []

if (0) {
    // Generate evenly spaced seed points (2D grid) 
    const n   = 20
    const nz  = [-0.5]
    console.log(nz)
    nz.forEach( z => {
        for (let i=0; i<n; ++i) {
            const x = bbox[0] + Lx * i / (n-1)
            for (let j=0; j<n; ++j) {
                const y = bbox[1] + Ly * j / (n-1)
                streamlines.push( dyn.generate([x,y,z]) )
            }
        }
    })
}
if (0) {
    const n = 500
    for (let i=0; i<n; ++i) {
        const x = bbox[0] + Lx * Math.random()
        const y = bbox[1] + Ly * Math.random()
        const z = 0 - 1 * Math.random()
        streamlines.push( dyn.generate([x,y,z]) )
    }
}

const pt = [-5855, -2829.5, -1031]
// const b1 = [-12155, -4130, -38026, -9555, -1529, 35964]
// const bbox1 = new geom.BBox([b1[0], b1[1], b1[2]], [b1[3], b1[4], b1[5]])
// const c = bbox1.center
// c[0] += 5000
streamlines.push( dyn.generate(pt) )

const dataframes = streamlines.map( s => {
    const indices = []
    for (let i=0; i<s.count-1; ++i) {
        indices.push(i, i+1)
    }
    return df.DataFrame.create({
        series: {
            positions: s,
            indices: df.Serie.create({array: indices, itemSize: 2})
        }
    })
})

console.log(streamlines.length)

fs.writeFileSync('/Users/fmaerten/data/streamlines/out.pl', io.encodeGocadPL(dataframes), 'utf8')

fs.writeFileSync('/Users/fmaerten/data/pointset/wellpoint.xyz', `# x y z
${pt[0]} ${pt[1]} ${pt[2]}`, 'utf8')