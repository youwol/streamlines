/**
 * Definition of a point or a vector in 3D space
 */
export type Vector = [number, number, number]

 /**
  * A bounding is given by its components
  * `[minx, miny, minz, maxx, maxy, maxz]`
  */
export type BBox = [number, number, number, number, number, number]
 
 /**
  * The field function
  */
export type FieldAt = (p: Vector) => Vector

/**
  * The normal function
  */
export type FieldAndNormalAt = (p: Vector) => {field: Vector, normal: Vector}
