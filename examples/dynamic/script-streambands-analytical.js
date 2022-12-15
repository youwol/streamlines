const stream = require('../../dist/@youwol/streamlines')
const df = require('@youwol/dataframe')
const io = require('@youwol/io')
const fs = require('fs')

const bbox = [-3, -3, -3, 3, 3, 3]

const fieldAt = (v) => {
    const x = v[0]
    const y = v[1]
    const z = v[2]
    return {
        field: [
            2 * x * y * z - y * Math.cos(x * y),
            x * x * z - x * Math.cos(x * y),
            x * x * y,
        ],
        normal: [x - z * Math.sin(x * z), z - y * Math.cos(y), Math.sin(x) * y],
    }
}

const dyn = new stream.DynanicStreamBands({
    bbox,
    fieldAt,
    dt: 0.02,
    maxPoints: 2000,
    width: 0.2,
})

const streamlines = []
const Lx = bbox[3] - bbox[0]
const Ly = bbox[4] - bbox[1]
const Lz = bbox[5] - bbox[2]
const xmin = bbox[0]
const ymin = bbox[1]
const zmin = bbox[2]

const n = 7

for (let i = 0; i < n; ++i) {
    const x = xmin + (Lx * i) / (n - 1)
    for (let j = 0; j < n; ++j) {
        const y = ymin + (Ly * j) / (n - 1)
        for (let k = 0; k < n; ++k) {
            const z = zmin + (Lz * k) / (n - 1)

            const { positions, indices } = dyn.generate([x, y, z])
            const dataframe = df.DataFrame.create({
                series: { positions, indices },
            })
            streamlines.push(dataframe)
        }
    }
}

console.log(streamlines.length)
fs.writeFileSync(
    '/Users/fmaerten/data/streamlines/out.ts',
    io.encodeGocadTS(streamlines),
    'utf8',
)
