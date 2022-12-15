import { vec } from '@youwol/math'
import { Plane } from '../lib/Plane'

const check = (plane: Plane, x: number, y: number, z: number) => {
    let p2: vec.Vector2 = [0, 0]
    let p3: vec.Vector3 = [0, 0, 0]

    expect(plane.toUV([x, y, z], p2)).toBeTruthy()
    expect(plane.fromUV(p2, p3)).toBeTruthy()
    expect(p3[0]).toBeCloseTo(x)
    expect(p3[1]).toBeCloseTo(y)
    expect(p3[2]).toBeCloseTo(z)
}

const check2 = (d: number, pr: vec.Vector3) => {
    expect(d).toBeCloseTo(1)
    expect(pr[0]).toBeCloseTo(0.5)
    expect(pr[1]).toBeCloseTo(0.5)
    expect(pr[2]).toBeCloseTo(0.0)
}
const check3 = (d: number, pr: vec.Vector3) => {
    expect(d).toBeCloseTo(0)
    expect(pr[0]).toBeCloseTo(0.5)
    expect(pr[1]).toBeCloseTo(0.5)
    expect(pr[2]).toBeCloseTo(0.0)
}

test('Plane test 1', () => {
    if (1) {
        const plane = new Plane([0, 0, 0], [1, 0, 0], [0, 1, 0])
        check(plane, 0, 0, 0)
        check(plane, 1, 0, 0)
        check(plane, 0, 1, 0)
    }
    if (0) {
        const plane = new Plane([0, 0, -10], [7, 0, -10], [0, 13, -10])
        check(plane, 0, 0, -10)
        check(plane, 7, 0, -10)
        check(plane, 0, 13, -10)
    }
    if (0) {
        const plane = new Plane([0, 0, 0], [1, 0, 0], [0, 0, 1])
        check(plane, 0, 0, 0)
        check(plane, 1, 0, 0)
        check(plane, 0, 0, 1)
    }
    if (0) {
        const plane = new Plane([1, 2, 3], [4, 6, 5], [9, 8, 7])
        check(plane, 1, 2, 3)
        check(plane, 9, 8, 7)
        check(plane, 4, 6, 5)
    }
})

test('Plane test 2', () => {
    {
        const plane = new Plane([0, 0, 0], [0, 1, 0], [1, 0, 0])

        let p1 = [0.5, 0.5, +1] as vec.Vector3
        let p2 = [0.5, 0.5, -1] as vec.Vector3
        let p3 = [0.5, 0.5, 0] as vec.Vector3
        let p1r: vec.Vector3 = [0, 0, 0]
        let p2r: vec.Vector3 = [0, 0, 0]
        let p3r: vec.Vector3 = [0, 0, 0]

        const d1 = plane.project(p1, p1r)
        const d2 = plane.project(p2, p2r)
        const d3 = plane.project(p3, p3r)

        check2(d1, p1r)
        check2(d2, p2r)
        check3(d3, p3r)
        // expect(d1).toBeCloseTo(1)
        // expect(p1r[0]).toBeCloseTo(0.5)
        // expect(p1r[1]).toBeCloseTo(0.5)
        // expect(p1r[2]).toBeCloseTo(0.0)

        // expect(d2).toBeCloseTo(1)
        // expect(p2r[0]).toBeCloseTo(0.5)
        // expect(p2r[1]).toBeCloseTo(0.5)
        // expect(p2r[2]).toBeCloseTo(0.0)

        // expect(d3).toBeCloseTo(0)
        // expect(p3r[0]).toBeCloseTo(0.5)
        // expect(p3r[1]).toBeCloseTo(0.5)
        // expect(p3r[2]).toBeCloseTo(0.0)
    }

    {
        const plane = new Plane([0, 0, 0], [1, 0, 0], [0, 1, 0])

        let p1 = [0.5, 0.5, +1] as vec.Vector3
        let p2 = [0.5, 0.5, -1] as vec.Vector3
        let p3 = [0.5, 0.5, 0] as vec.Vector3
        let p1r: vec.Vector3
        let p2r: vec.Vector3
        let p3r: vec.Vector3

        const d1 = plane.project(p1, p1r)
        const d2 = plane.project(p2, p2r)
        const d3 = plane.project(p3, p3r)

        check2(d1, p1r)
        check2(d2, p2r)
        check3(d3, p3r)

        // expect(d1).toBeCloseTo(1)
        // expect(p1r[0]).toBeCloseTo(0.5)
        // expect(p1r[1]).toBeCloseTo(0.5)
        // expect(p1r[2]).toBeCloseTo(0.0)

        // expect(d2).toBeCloseTo(1)
        // expect(p2r[0]).toBeCloseTo(0.5)
        // expect(p2r[1]).toBeCloseTo(0.5)
        // expect(p2r[2]).toBeCloseTo(0.0)

        // expect(d3).toBeCloseTo(0)
        // expect(p3r[0]).toBeCloseTo(0.5)
        // expect(p3r[1]).toBeCloseTo(0.5)
        // expect(p3r[2]).toBeCloseTo(0.0)
    }
})
