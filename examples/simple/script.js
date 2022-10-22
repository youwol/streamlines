const stream = require('../../dist/@youwol/streamlines')
const io     = require('../../../io/dist/@youwol/io')
const df     = require('@youwol/dataframe')
const math   = require('@youwol/math')
const fs     = require('fs')

/*
Check:
    - Octree
    - Plane
    - Ray
    - Ray2D
    - StreamLines
*/

const filename = '/Users/fmaerten/data/arch/fernandina/out/result-grid-4.ts'
const surface = io.decodeGocadTS( fs.readFileSync(filename, 'utf8'), {repair: true} )[0]

// const surface = df.DataFrame.create({
//     series: {
//         positions: df.Serie.create({array: [-0.5,-0.5,0, 0.5,-0.5,0, 0.5,0.5,0, -0.5,0.5,0], itemSize: 3}),
//         indices  : df.Serie.create({array: [0,1,2, 0,2,3], itemSize: 3}),
//         v        : df.Serie.create({array: [1,2,0, 3,2,0, 2,3,0, 1,3,0], itemSize: 3}),
//     }
// })
 
const manager = new df.Manager(surface, [new math.EigenVectorsDecomposer])

const lines = stream.surfaceStreamlines({
    nodes: surface.series.positions,
    faces: surface.series.indices,
    // fieldAttribute: surface.series.v,
    fieldAttribute: manager.serie(3, 'S3'),
    verbose: true
})

const indices = []
for (let i=0; i<lines.length; i+=2) {
    indices.push(i, i+1)
}

const dataframe = df.DataFrame.create({
    series: {
        positions: df.Serie.create({array: lines, itemSize: 3}),
        indices  : df.Serie.create({array: indices, itemSize: 2})
    }
})

fs.writeFileSync('/Users/fmaerten/data/streamlines/out.pl', io.encodeGocadPL(dataframe), 'utf8')
