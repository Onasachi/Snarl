// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * Whether a drawing has no crossing strings — the whole win condition of snarl, checked
 * on chain.
 *
 * Integer arithmetic throughout, so this is exact. The game's own engine works in floats
 * and needs an epsilon to decide whether two strings really meet; here there is nothing to
 * decide. A position either crosses or it does not.
 */
library Planarity {
    /** Positions live on a fixed grid, so the cross products below cannot run away. */
    int256 internal constant GRID = 1_000_000;

    error BadEdgeList();
    error BadPositions();
    error OutOfBounds();

    /**
     * Twice the signed area of the triangle abc: positive if c is left of a->b, negative
     * if right, zero if the three are in line.
     *
     * Unchecked, and safe to be: `crossings` rejects any drawing with a coordinate
     * outside 0..GRID before it compares anything, so every difference below is within
     * ±10^6 and every product within ±10^12. An int256 has room for about 5.8 × 10^76.
     * This matters because the comparison runs four times for every pair of strings —
     * 465 pairs on the densest creature in the game — and Solidity's overflow checks on
     * a multiplication cost more than the multiplication does. Leaving them in was most
     * of the price of a proof.
     */
    function orientation(
        int256 ax,
        int256 ay,
        int256 bx,
        int256 by,
        int256 cx,
        int256 cy
    ) internal pure returns (int256) {
        unchecked {
            return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        }
    }

    /**
     * True only when strings a-b and c-d cross properly — at a point strictly inside
     * both. Segments that merely touch at an end, or lie along each other, do not count,
     * which is what lets two strings meet at the bead they share.
     *
     * Takes bead indices rather than eight coordinates: eight would not fit on the stack
     * at the call site, and this way the comparison and the drawing cannot disagree about
     * which bead is which.
     */
    function crossesAt(
        int256[] memory xs,
        int256[] memory ys,
        uint256 a,
        uint256 b,
        uint256 c,
        uint256 d
    ) internal pure returns (bool) {
        int256 o1 = orientation(xs[a], ys[a], xs[b], ys[b], xs[c], ys[c]);
        int256 o2 = orientation(xs[a], ys[a], xs[b], ys[b], xs[d], ys[d]);
        // c and d on the same side of a-b, or either one exactly on it: no crossing.
        if (o1 == 0 || o2 == 0 || (o1 > 0) == (o2 > 0)) return false;

        int256 o3 = orientation(xs[c], ys[c], xs[d], ys[d], xs[a], ys[a]);
        int256 o4 = orientation(xs[c], ys[c], xs[d], ys[d], xs[b], ys[b]);
        return o3 != 0 && o4 != 0 && (o3 > 0) != (o4 > 0);
    }

    /**
     * Counts the crossings in a drawing. `edges` is two bytes per edge, each byte a bead
     * index, so a creature may have up to 256 beads — four times the largest in the game.
     *
     * Cost is quadratic in the number of edges. The weekly knot carries 15 strings, which
     * is 105 pairs; the densest creature in the game carries 29, which is 406. Both are
     * small enough to check in a transaction on Celo.
     */
    function crossings(
        bytes memory edges,
        int256[] memory xs,
        int256[] memory ys
    ) internal pure returns (uint256 found) {
        if (edges.length == 0 || edges.length % 2 != 0) revert BadEdgeList();
        if (xs.length != ys.length || xs.length == 0) revert BadPositions();

        uint256 beads = xs.length;
        for (uint256 i = 0; i < beads; ++i) {
            if (xs[i] < 0 || xs[i] > GRID || ys[i] < 0 || ys[i] > GRID) revert OutOfBounds();
        }

        uint256 count = edges.length / 2;
        for (uint256 i = 0; i < count; ++i) {
            uint256 a = uint8(edges[i * 2]);
            uint256 b = uint8(edges[i * 2 + 1]);
            if (a >= beads || b >= beads || a == b) revert BadEdgeList();

            for (uint256 j = i + 1; j < count; ++j) {
                uint256 c = uint8(edges[j * 2]);
                uint256 d = uint8(edges[j * 2 + 1]);

                // Strings that meet at a bead are not a crossing.
                if (a == c || a == d || b == c || b == d) continue;

                if (crossesAt(xs, ys, a, b, c, d)) {
                    unchecked {
                        ++found;
                    }
                }
            }
        }
    }

    /** The win condition. */
    function isUntangled(
        bytes memory edges,
        int256[] memory xs,
        int256[] memory ys
    ) internal pure returns (bool) {
        return crossings(edges, xs, ys) == 0;
    }
}
