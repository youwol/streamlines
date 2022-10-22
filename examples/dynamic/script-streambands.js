const arch   = require('../../../../../platform/components/arch-node/build/Release/arch')
const stream = require('../../dist/@youwol/streamlines')
const df     = require('@youwol/dataframe')
const math   = require('@youwol/math')
const io     = require('@youwol/io')
const fs     = require('fs')


const model = new arch.Model()
model.setHalfSpace( false )
model.setMaterial ( 0.25, 1, 1000 )
model.addSurface  ( new arch.Surface([-0.5,-0.5,-1, 0.5,-0.5,-1, 0.5,0.5,0, -0.5,0.5,0], [0,1,2, 0,2,3]) )
model.addRemote   ( new arch.UserRemote( (x,y,z) => [1,0.5,0,0,0,-1] ) )
const bbox  = model.bounds().map( v => v*1.5)

const solver   = new arch.Forward(model, 'seidel', 1e-9, 200)
solver.run()

const solution = new arch.Solution(model)

const fieldAt = (v) => {
    const stress = solution.stressAt(v[0], v[1], v[2])
    const {values, vectors} = math.eigen(stress)
    const i = 2
    const j = 1
    return {
        field : [vectors[3*i], vectors[3*i+1], vectors[3*i+2]],
        normal: [vectors[3*j], vectors[3*j+1], vectors[3*j+2]]
    }
}

const dyn = new stream.DynanicStreamBands({
    bbox, 
    fieldAt,
    dt: 0.005,
    maxPoints: 200,
    width: .05,

})

const streamlines = []
const Lx = (bbox[3]-bbox[0])
const Ly = (bbox[4]-bbox[1])
const Lz = (bbox[5]-bbox[2])

const n   = 15
const nz  = [-0.5]

nz.forEach( z => {
    for (let i=0; i<n; ++i) {
        const x = bbox[0] + Lx * i / (n-1)
        for (let j=0; j<n; ++j) {
            const y = bbox[1] + Ly * j / (n-1)
            const {positions, indices} = dyn.generate([x,y,z])
            const dataframe = df.DataFrame.create({series: {positions, indices}})
            streamlines.push(dataframe)
        }
    }
})

console.log(streamlines.length)
fs.writeFileSync('/Users/fmaerten/data/streamlines/out.ts', io.encodeGocadTS(streamlines), 'utf8')
