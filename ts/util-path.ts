import {PathCommand} from '@svgdotjs/svg.js';
import {degreesToRadians} from './Rotator';

export const rect = (x: number, y: number, width: number, height: number): PathCommand[] => [
    ['M', x, y],
    ['h', width],
    ['v', height],
    ['H', x],
    ['Z']];

export const rotatedRect = (x: number, y: number, width: number, height: number, direction: number): PathCommand[] => {
    const theta = degreesToRadians(direction);
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const lineToPoint = (lx: number, ly: number): PathCommand => ['L',
        x + lx * cos - ly * sin,
        y + lx * sin + ly * cos];
    return [
        ['M', x, y],
        lineToPoint(width, 0),
        lineToPoint(width, height),
        lineToPoint(0, height),
        ['Z']];
};

export const poly = (points: [number, number][]): PathCommand[] =>
    points.map(([x, y], i) => [i === 0 ? 'M' : 'L', x, y]);

export const circle = (cx: number, cy: number, r: number): PathCommand[] => [
    ['M', cx - r, cy],
    ['a', r, r, 0, 1, 0, r * 2, 0],
    ['a', r, r, 0, 1, 0, r * -2, 0]];

export const polyRectRel = (x: number, y: number, ...legs: number[]): PathCommand[] => {
    const result: PathCommand[] = [['M', x, y]];
    let [dx, dy] = [0, 0];
    legs.forEach((l, i) => {
        if (l === 0) return;
        const x = i % 2 === 0;
        if (x) {
            dx += l;
        } else {
            dy += l;
        }
        const origin = dx === 0 && dy === 0;
        result.push(origin ? ['Z'] : x ? ['h', l] : ['v', l]);
    });
    if (dx === 0 && dy === 0) {
        // Path is already closed
    } else if (dx === 0 || dy === 0) {
        // Path can be closed with a line
        result.push(['Z']);
    } else {
        // Path can be closed with two lines
        const x = legs.length % 2 === 0;
        result.push(x ? ['h', -dx] : ['v', -dy]);
        result.push(['Z']);
    }
    return result;
};

export const polyRect = (x: number, y: number, ...legs: number[]): PathCommand[] => {
    const result: PathCommand[] = [['M', x, y]];
    let [dx, dy] = [0, 0];
    legs.forEach((l, i) => {
        const xDirection = i % 2 === 0;
        if (xDirection) {
            dx = l - x;
        } else {
            dy = l - y;
        }
        const origin = dx === 0 && dy === 0;
        result.push(origin ? ['Z'] : xDirection ? ['H', l] : ['V', l]);
    });
    if (dx === 0 && dy === 0) {
        // Path is already closed
    } else if (dx === 0 || dy === 0) {
        // Path can be closed with a line
        result.push(['Z']);
    } else {
        // Path can be closed with two lines
        const xDirection = legs.length % 2 === 0;
        result.push(xDirection ? ['H', x] : ['V', y]);
        result.push(['Z']);
    }
    return result;
};

export const combine = (...commands: PathCommand[][]): PathCommand[] =>
    commands.flatMap((v) => v);
