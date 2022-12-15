import { create } from 'domain'

export { surfaceStreamlines, StreamLinesOnSurface } from './surfaceStreamlines'
export * from './DynanicStreamLines'
export * from './DynanicStreamBands'
export * from './types'

// ---------------------------------------------------

// TEST
//
// Allows to do functional programming:
//   const b = v.scale(3).sub(w).add(a).cross(c)
//

// class Vector3 {
//     public readonly x: number[]

//     static create(x: number | number[], y?: number, z?: number) {
//         return new Vector3(x,y,z)
//     }
//     static createFrom(x: number[] | Vector3, y: number[] | Vector3) {
//         if (Array.isArray(x)) {
//             if (!Array.isArray(y)) throw new Error('y must be of the same type as x')
//             return new Vector3(y.map( (v,i) => v-x[i]) )
//         }
//         else {
//             if (Array.isArray(y)) throw new Error('y must be of the same type as x')
//             return new Vector3(y.x.map( (v,i) => v-x.x[i]) )
//         }
//     }

//     constructor(x: number | number[], y?: number, z?: number) {
//         if (Array.isArray(x)) {
//             this.x = [...x]
//             if (x.length !== 3) throw new Error('array x must be of size 3')
//         }
//         else (
//             this.x = [x, y,z ]
//         )
//     }

//     cross(V: Vector3): Vector3 {
//         const v = this.x
//         const w = V.x
//         let x = v[1] * w[2] - v[2] * w[1]
//         let y = v[2] * w[0] - v[0] * w[2]
//         let z = v[0] * w[1] - v[1] * w[0]
//         return Vector3.create(x,y,z)
//     }

//     norm2(): number {
//         return this.x.reduce( (acc,w) => acc+w**2, 0)
//     }

//     dot(v: Vector3): number {
//         return this.x.reduce( (acc, cur, i) => acc + cur*v.x[i], 0)
//     }

//     norm(): number {
//         return Math.sqrt( this.norm2() )
//     }

//     normalize(): Vector3 {
//         const n = this.norm()
//         return Vector3.create( this.x.map( w => w/n) )
//     }

//     // this + v
//     add(v: Vector3): Vector3 {
//         return Vector3.create(this.x.map( (w,i) => w+v[i]))
//     }

//     // this - v
//     sub(v: Vector3): Vector3 {
//         return Vector3.create(this.x.map( (w,i) => w-v[i]))
//     }

//     scale(s: number): Vector3 {
//         return Vector3.create( this.x.map( w => w*s ) )
//     }

//     set(x: number, y: number, z?: number) {
//         if (z === undefined) {
//             this.x[y] = x
//         }
//         else {
//             this.x[0] = x
//             this.x[1] = y
//             this.x[2] = z
//         }
//     }

//     clone(): Vector3 {
//         return Vector3.create(this.x)
//     }

// }
