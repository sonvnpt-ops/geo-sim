import { makeDefault2DObject } from '../math/geometry2d';
import { makeDefault3DObject } from '../math/geometry3d';
import { Geo2DObject, Geo3DObject } from '../types/geometry';

export interface Preset3D {
  id: string;
  title: string;
  subtitle: string;
  build: () => Geo3DObject[];
}

export interface Preset2D {
  id: string;
  title: string;
  subtitle: string;
  build: () => Geo2DObject[];
}

export const PRESETS_3D: Preset3D[] = [
  {
    id: 'pyramid_quad_section',
    title: 'Thiết diện hình chóp S.ABCD',
    subtitle: 'Mặt phẳng (P) cắt khối chóp tứ giác đều',
    build: () => {
      const pyramid = makeDefault3DObject(
        'pyramid_quad',
        0,
        { width: 3.4, height: 4.0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      );
      pyramid.color = '#0284C7';
      pyramid.opacity = 0.52;

      const plane = makeDefault3DObject(
        'plane3d',
        1,
        { planeSize: 7.5 },
        { x: 0, y: 1.7, z: 0 },
        { x: 0.32, y: 0.18, z: 0.22 },
      );
      plane.name = 'Mặt phẳng (P)';
      plane.color = '#0EA5E9';
      plane.opacity = 0.28;

      return [pyramid, plane];
    },
  },
  {
    id: 'cube_hexagon',
    title: 'Thiết diện lục giác hình lập phương',
    subtitle: 'Mặt phẳng cắt qua 6 mặt tạo lục giác đều',
    build: () => {
      const cube = makeDefault3DObject(
        'cube',
        0,
        { width: 3.2 },
        { x: 0, y: 0, z: 0 },
      );
      cube.color = '#059669';
      cube.opacity = 0.48;

      const plane = makeDefault3DObject(
        'plane3d',
        1,
        { planeSize: 7.5 },
        { x: 0, y: 1.6, z: 0 },
        // Normal parallel to (1, 1, 1): rotate X by atan(sqrt(2))? Wait: (0,1,0) rotated around X by 54.7° and Z by -45° aligns roughly to (1,1,1)
        { x: 0.615, y: 0, z: -0.785 },
      );
      plane.name = 'Mặt phẳng (P)';
      plane.color = '#0EA5E9';
      plane.opacity = 0.28;

      return [cube, plane];
    },
  },
  {
    id: 'cone_ellipse',
    title: 'Thiết diện hình nón (Đường Elip)',
    subtitle: 'Mặt phẳng nghiêng cắt khối nón tròn xoay',
    build: () => {
      const cone = makeDefault3DObject(
        'cone',
        0,
        { radius: 2.0, height: 4.4 },
        { x: 0, y: 0, z: 0 },
      );
      cone.name = 'Hình nón';
      cone.color = '#D97706';
      cone.opacity = 0.54;

      const plane = makeDefault3DObject(
        'plane3d',
        1,
        { planeSize: 7.5 },
        { x: 0, y: 1.85, z: 0 },
        { x: 0.36, y: 0, z: 0.16 },
      );
      plane.name = 'Mặt phẳng (P)';
      plane.color = '#0284C7';
      plane.opacity = 0.28;

      return [cone, plane];
    },
  },
  {
    id: 'two_planes_line',
    title: 'Giao tuyến hai mặt phẳng (P) & (Q)',
    subtitle: 'Hiển thị đường giao tuyến nét liền và nét khuất',
    build: () => {
      const p1 = makeDefault3DObject(
        'plane3d',
        0,
        { planeSize: 7.2 },
        { x: 0, y: 1.6, z: 0 },
        { x: 0.15, y: 0.1, z: 0.42 },
      );
      p1.name = 'Mặt phẳng (P)';
      p1.color = '#0284C7';
      p1.opacity = 0.35;

      const p2 = makeDefault3DObject(
        'plane3d',
        1,
        { planeSize: 7.2 },
        { x: 0.2, y: 1.8, z: 0 },
        { x: -0.25, y: 0.15, z: -0.45 },
      );
      p2.name = 'Mặt phẳng (Q)';
      p2.color = '#059669';
      p2.opacity = 0.35;

      return [p1, p2];
    },
  },
  {
    id: 'line_pierce_prism',
    title: 'Đường thẳng xuyên qua lăng trụ',
    subtitle: 'Xác định 2 giao điểm và đoạn nằm trong khối',
    build: () => {
      const prism = makeDefault3DObject(
        'prism_right',
        0,
        { width: 3.2, height: 3.6 },
        { x: 0, y: 0, z: 0 },
      );
      prism.color = '#4F46E5';
      prism.opacity = 0.5;

      const line = makeDefault3DObject(
        'line3d',
        1,
        { height: 10 },
        { x: 0.1, y: 1.8, z: 0.1 },
        { x: 0.42, y: 0.2, z: 1.05 },
      );
      line.name = 'Đường thẳng d';
      line.color = '#7C3AED';

      return [prism, line];
    },
  },
];

export const PRESETS_2D: Preset2D[] = [
  {
    id: 'poly_circle_secant',
    title: 'Tam giác, Đường tròn & Cát tuyến',
    subtitle: 'Hiển thị giao điểm và miền diện tích giao nhau',
    build: () => {
      const tri = makeDefault2DObject('triangle', 0, {
        size: 4.4,
        height: 3.6,
        offset: { x: -0.9, y: -0.2 },
      });
      tri.name = 'Tam giác ABC';
      tri.color = '#0284C7';

      const circle = makeDefault2DObject('circle2d', 1, {
        radius: 2.1,
        offset: { x: 1.1, y: 0.3 },
      });
      circle.name = 'Đường tròn (O)';
      circle.color = '#059669';
      circle.opacity = 0.22;

      const line = makeDefault2DObject('line2d', 2, {
        offset: { x: 0, y: 0.4 },
      });
      line.name = 'Đường thẳng d';
      line.color = '#7C3AED';
      line.points = [
        { x: -3.2, y: -0.7 },
        { x: 3.2, y: 1.4 },
      ];

      return [tri, circle, line];
    },
  },
  {
    id: 'two_polygons_overlap',
    title: 'Hai đa giác giao nhau',
    subtitle: 'Tô nổi bật phần diện tích giao nhau theo thời gian thực',
    build: () => {
      const sq = makeDefault2DObject('square', 0, {
        size: 3.6,
        offset: { x: -0.8, y: 0 },
      });
      sq.name = 'Hình vuông ABCD';
      sq.color = '#0284C7';

      const trap = makeDefault2DObject('isosceles_trapezoid', 1, {
        width: 4.2,
        height: 3.0,
        offset: { x: 0.9, y: 0.3 },
      });
      trap.name = 'Hình thang cân';
      trap.color = '#D97706';

      return [sq, trap];
    },
  },
  {
    id: 'angle_and_ray',
    title: 'Góc, Tia và Hình bình hành',
    subtitle: 'Khám phá số đo góc và giao điểm các đường',
    build: () => {
      const para = makeDefault2DObject('parallelogram', 0, {
        width: 4.4,
        height: 2.6,
        offset: { x: 0.4, y: 0.3 },
      });
      para.name = 'Hình bình hành';
      para.color = '#4F46E5';

      const angle = makeDefault2DObject('angle2d', 1, {
        offset: { x: -1.8, y: -0.6 },
      });
      angle.name = 'Góc xOy';
      angle.color = '#059669';

      return [para, angle];
    },
  },
];
