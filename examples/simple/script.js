const stream = require('../../dist/@youwol/streamlines')
const io     = require('../../../io/dist/@youwol/io')
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

const lines = stream.surfaceStreamlines({
    nodes: surface.series.positions,
    faces: surface.series.indices,
    fieldAttribute: surface.series.Joint,
    verbose: true
})

console.log(lines)
