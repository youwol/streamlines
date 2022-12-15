import { vec } from '@youwol/math'
import { BBox } from '@youwol/geometry'
import { createV3 } from './utils'

export class Octree {
    bbox_: BBox = undefined
    root_: Cell = undefined
    maxDepth = 5
    maxItems = 10

    constructor(box: BBox, max_depth: number, max_nb_items_in_cell: number) {
        this.bbox_ = box
        this.maxDepth = max_depth
        this.maxItems = max_nb_items_in_cell
        this.root_ = new Cell(0, undefined, this.bbox_.min, this.bbox_.max)
    }

    addItems(items: Array<vec.Vector3>) {
        const root_cell = this.root_
        const root_bbox = this.bbox_

        items.forEach((item) => {
            //geom::Point3d pt = point3d_from_t_function_(item);
            if (root_bbox.inside(item)) {
                root_cell.add_item(item)
            }
        })

        // Refining the tree...
        this.subdivide_cell(root_cell, this.maxDepth, this.maxItems)
    }

    addItem(item: vec.Vector3) {
        const root_cell = this.root_
        const root_bbox = this.bbox_

        if (root_bbox.contains(item)) {
            // Getting the container cell...
            const container_cell = this.getCellContaining(item)
            container_cell.add_item(item)
            // Refining the tree...
            this.subdivide_cell(container_cell, this.maxDepth, this.maxItems)
        }
    }

    get rootBBox() {
        return this.root_.bbox
    } // <-------------

    getCellCenter(cell: Cell = this.root_): vec.Vector3 {
        return vec.scale(
            vec.add(vec.clone(cell.min), cell.max),
            0.5,
        ) as vec.Vector3
        // return cell.min.clone().add(cell.max).scale(0.5)
    }

    getItemsNear(
        pt: vec.Vector3,
        items: Array<vec.Vector3>,
        check_mother: boolean,
    ): void {
        const root_bbox = this.bbox_
        items = []
        if (root_bbox.contains(pt) == false) {
            return
        }
        // Getting the container cell...
        let container_cell = this.root_
        while (container_cell.has_children == true) {
            container_cell = container_cell.get_child_containing(pt)
        }
        if (container_cell.nb_items > 0) {
            container_cell.items_.forEach((item) => {
                items.push(item)
            })
        } else if (check_mother == true) {
            // Getting the items stored in the mother of the container cell...
            const mother = container_cell.mother
            if (mother !== undefined) {
                mother.do_get_all_items(items)
            }
        }
    }

    getItemsIn(bbox: BBox, items: Array<vec.Vector3>) {
        const root_bbox = this.bbox_
        items = []
        const bbox_fit = bbox.getIntersection(root_bbox)
        if (bbox_fit.empty === true) {
            return
        }
        this.root_.get_intersected_items(bbox_fit, items)
    }

    getCellContaining(pt: vec.Vector3): Cell {
        const root_cell = this.root_
        let container_cell = root_cell
        while (container_cell.has_children === true) {
            container_cell = container_cell.get_child_containing(pt)
        }
        return container_cell
    }

    getAllItemsInCell(cell: Cell = this.root_, items: Array<vec.Vector3>) {
        cell.do_get_all_items(items)
    }

    visit_terminal_children(f: Function) {
        this.root_.do_visit_terminal_children(f)
    }

    // refine_cell(cell: Cell, start_depth: number, max_depth: number, max_nb_items_in_cell: number) {
    //     cell.do_refine(start_depth, max_depth, max_nb_items_in_cell)
    // }

    private subdivide_cell(
        cell: Cell,
        max_depth: number,
        max_nb_items_in_cell: number,
    ) {
        cell.do_subdivide(max_depth, max_nb_items_in_cell)
    }

    private get_actual_max_depth(): number {
        let o = { depth: 0 }
        this.root_.do_get_actual_max_depth(o)
        return o.depth
    }
}

/**************************************************/

class Cell {
    depth_ = 0
    min_: vec.Vector3
    max_: vec.Vector3
    children_: Array<Cell> = new Array(8)
    items_: Array<vec.Vector3> = []
    mother_: Cell = undefined

    constructor(
        depth: number,
        mother: Cell,
        min: vec.Vector3,
        max: vec.Vector3,
    ) {
        this.mother_ = mother
        this.depth_ = depth
        this.min_ = min
        this.max_ = max
        for (let i = 0; i < 7; ++i) {
            this.children_[i] = undefined
        }
    }

    get mother() {
        return this.mother_
    }
    get depth() {
        return this.depth_
    }
    get min() {
        return this.min_
    }
    get max() {
        return this.max_
    }
    get nb_items(): number {
        return this.items_.length
    }
    get has_children(): boolean {
        return this.children_[0] !== undefined
    }
    get bbox() {
        return new BBox(this.min_, this.max_)
    } // <------ optim ?

    do_get_all_items(items: Array<vec.Vector3>) {
        if (this.has_children == true) {
            for (let i = 0; i < 8; ++i) {
                const child = this.children_[i]
                child.do_get_all_items(items)
            }
        } else {
            this.items_.forEach((item) => {
                items.push(item)
            })
        }
    }

    get_intersected_items(box: BBox, items: Array<vec.Vector3>) {
        if (this.has_children === true) {
            for (let i = 0; i < 8; ++i) {
                const child = this.children_[i]
                const bbox = new BBox(child.min, child.max)
                if (bbox.intersect(box) === true) {
                    child.get_intersected_items(box, items)
                }
            }
        } else {
            this.items_.forEach((item) => {
                items.push(item)
            })
        }
    }

    get_child_containing(pt: vec.Vector3): Cell {
        const half_x = (this.min_[0] + this.max_[0]) / 2
        const half_y = (this.min_[1] + this.max_[1]) / 2
        const half_z = (this.min_[2] + this.max_[2]) / 2
        if (pt[0] <= half_x) {
            if (pt[1] <= half_y) {
                if (pt[2] <= half_z) {
                    return this.children_[0]
                } else {
                    return this.children_[4]
                }
            } else {
                if (pt[2] <= half_z) {
                    return this.children_[3]
                } else {
                    return this.children_[7]
                }
            }
        } else {
            if (pt[1] <= half_y) {
                if (pt[2] <= half_z) {
                    return this.children_[1]
                } else {
                    return this.children_[5]
                }
            } else {
                if (pt[2] <= half_z) {
                    return this.children_[2]
                } else {
                    return this.children_[6]
                }
            }
        }
    }

    add_item(item: vec.Vector3) {
        this.items_.push(item)
    }

    do_subdivide(max_depth: number, max_nb_items_in_cell: number) {
        if (
            this.depth >= max_depth ||
            (this.has_children == false &&
                this.nb_items <= max_nb_items_in_cell)
        ) {
            // This cell does not need to be subdivided !
            return
        }
        if (this.has_children === false) {
            const half_x = (this.min_[0] + this.max_[0]) / 2
            const half_y = (this.min_[1] + this.max_[1]) / 2
            const half_z = (this.min_[2] + this.max_[2]) / 2

            const min = this.min_
            const max = this.max_

            this.children_[0] = new Cell(
                this.depth_ + 1,
                this,
                min,
                createV3(half_x, half_y, half_z) as vec.Vector3,
            )
            this.children_[1] = new Cell(
                this.depth_ + 1,
                this,
                createV3(half_x, min[1], min[2]),
                createV3(max[0], half_y, half_z),
            )
            this.children_[2] = new Cell(
                this.depth_ + 1,
                this,
                createV3(half_x, half_y, min[2]),
                createV3(max[0], max[1], half_z),
            )
            this.children_[3] = new Cell(
                this.depth_ + 1,
                this,
                createV3(min[0], half_y, min[2]),
                createV3(half_x, max[1], half_z),
            )
            this.children_[4] = new Cell(
                this.depth_ + 1,
                this,
                createV3(min[0], min[1], half_z),
                createV3(half_x, half_y, max[2]),
            )
            this.children_[5] = new Cell(
                this.depth_ + 1,
                this,
                createV3(half_x, min[1], half_z),
                createV3(max[0], half_y, max[2]),
            )
            this.children_[6] = new Cell(
                this.depth_ + 1,
                this,
                createV3(half_x, half_y, half_z),
                createV3(max[0], max[1], max[2]),
            )
            this.children_[7] = new Cell(
                this.depth_ + 1,
                this,
                createV3(min[0], half_y, half_z),
                createV3(half_x, max[1], max[2]),
            )
            //this.subdivided_ = true
        }
        // Dispatching items in children...
        this.items_.forEach((item) => {
            const child = this.get_child_containing(item)
            child.add_item(item)
        })
        this.items_ = []
        // Continuing subdivision...
        for (let i = 0; i < 8; ++i) {
            const child = this.children_[i]
            child.do_subdivide(max_depth, max_nb_items_in_cell)
        }
    }

    do_get_actual_max_depth(max_depth: { depth: number }) {
        if (this.has_children == true) {
            for (let i = 0; i < 8; ++i) {
                this.children_[i].do_get_actual_max_depth(max_depth)
            }
        } else {
            if (this.depth_ > max_depth.depth) {
                max_depth.depth = this.depth_
            }
        }
    }

    do_visit_terminal_children(f: Function) {
        if (this.has_children == true) {
            this.children_.forEach((c) => c.do_visit_terminal_children(f))
        } else {
            f(this)
        }
    }
}
