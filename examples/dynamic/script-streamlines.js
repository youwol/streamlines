const arch = require('../../../../../platform/components/arch-node/build/Release/arch')
const stream = require('../../dist/@youwol/streamlines')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const io = require('@youwol/io')
const fs = require('fs')

const model = new arch.Model()
model.setHalfSpace(false)
model.setMaterial(0.25, 1, 1000)
model.addSurface(
    new arch.Surface(
        [-0.5, -0.5, -1, 0.5, -0.5, -1, 0.5, 0.5, 0, -0.5, 0.5, 0],
        [0, 1, 2, 0, 2, 3],
    ),
)
model.addRemote(new arch.UserRemote((x, y, z) => [0, 0, 0, 0, 0, -1]))
const bbox = model.bounds().map((v) => v * 2)

const solver = new arch.Forward(model, 'seidel', 1e-9, 200)
solver.run()

const solution = new arch.Solution(model)

const fieldAt = (v) => {
    const stress = solution.stressAt(v[0], v[1], v[2])
    const { values, vectors } = math.eigen(stress)
    const i = 0
    // return [vectors[3], vectors[4], vectors[5]] // $$sigma_2$$
    return [vectors[3 * i], vectors[3 * i + 1], 0]
    // return [vectors[3*i], vectors[3*i+1], vectors[3*i+2]]
}

const dyn = new stream.DynanicStreamLines({
    bbox,
    fieldAt,
    dt: 0.002,
    maxPoints: 200,
})

const streamlines = []
const Lx = bbox[3] - bbox[0]
const Ly = bbox[4] - bbox[1]
const Lz = bbox[5] - bbox[2]
// console.log(Lx, Ly, Lz)

if (1) {
    // Generate evenly spaced seed points (2D grid)
    const n = 20
    const nz = [-0.5]
    console.log(nz)
    // const nz  = new Array(n).fill(0).map( (_,i) => bbox[2] + Lz * i / (n-1) )
    nz.forEach((z) => {
        // const z = bbox[2] + Lz * k / (nz-1)
        for (let i = 0; i < n; ++i) {
            const x = bbox[0] + (Lx * i) / (n - 1)
            for (let j = 0; j < n; ++j) {
                const y = bbox[1] + (Ly * j) / (n - 1)
                streamlines.push(dyn.generate([x, y, z]))
                // console.log(x,y,z)
            }
        }
    })
} else {
    const n = 500
    for (let i = 0; i < n; ++i) {
        const x = bbox[0] + Lx * Math.random()
        const y = bbox[1] + Ly * Math.random()
        const z = 0 - 1 * Math.random()
        streamlines.push(dyn.generate([x, y, z]))
    }
}

const dataframes = streamlines.map((s) => {
    const indices = []
    for (let i = 0; i < s.count - 1; ++i) {
        indices.push(i, i + 1)
    }
    return df.DataFrame.create({
        series: {
            positions: s,
            indices: df.Serie.create({ array: indices, itemSize: 2 }),
        },
    })
})

console.log(streamlines.length)

fs.writeFileSync(
    '/Users/fmaerten/data/streamlines/out.pl',
    io.encodeGocadPL(dataframes),
    'utf8',
)
