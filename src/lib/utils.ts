import { vec } from "@youwol/math"

/**
 * @param v nothing, Vector2 or a number
 * @param y nothing or a number
 * @example
 * ```js
 * const v1 = createV2()
 * const v2 = createV2(v1)
 * const v3 = createV2(0.1, 2.3)
 * ```
 */
export const createV2 = (v?: vec.Vector2 | number, y?: number) => {
    if (y !== undefined) {
        return [v as number, y] as vec.Vector2
    }
    return (v!==undefined ? [...v as vec.Vector2] : [0,0]) as vec.Vector2
}

/**
 * @param v nothing, Vector3 or a number
 * @param y nothing or a number
 * @param z nothing or a number
 * @example
 * ```js
 * const v1 = createV3()
 * const v2 = createV3(v1)
 * const v3 = createV3(0.1, 2.3, 8)
 * ```
 */
export const createV3 = (v?: vec.Vector3 | number, y?: number, z?: number) => {
    if (y!==undefined && z!==undefined) {
        return [v as number, y, z] as vec.Vector3
    }
    return (v!==undefined ? [...v as vec.Vector3] : [0,0,0]) as vec.Vector3
}

export const setV2 = (v: vec.Vector2, x: number, y: number) => {
    v[0] = x
    v[1] = y
    return v
}

export const setV3 = (v: vec.Vector3, x: number, y: number, z: number) => {
    v[0] = x
    v[1] = y
    v[2] = z
    return v
}
