import { Image, View } from "react-native";

const tileSize = 256;

type Point = { latitude: number; longitude: number };

type Frame = {
  zoom: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export function project(point: Point, zoom: number): { x: number; y: number } {
  const scale = 2 ** zoom;
  const latitude = Math.max(Math.min(point.latitude, 85), -85) * (Math.PI / 180);
  return {
    x: ((point.longitude + 180) / 360) * scale,
    y: (1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) / 2 * scale,
  };
}

export function fitMap(points: Point[], width: number, height: number): Frame {
  const roomX = Math.max(width - 72, 160);
  const roomY = Math.max(height - 200, 160);
  let zoom = 11;
  for (let candidate = 15; candidate >= 11; candidate -= 1) {
    const span = spanOf(points, candidate);
    if (span.x * tileSize <= roomX && span.y * tileSize <= roomY) {
      zoom = candidate;
      break;
    }
  }
  const projected = points.map((point) => project(point, zoom));
  const centerX = (Math.min(...projected.map((point) => point.x)) + Math.max(...projected.map((point) => point.x))) / 2;
  const centerY = (Math.min(...projected.map((point) => point.y)) + Math.max(...projected.map((point) => point.y))) / 2;
  return {
    zoom,
    originX: centerX - width / 2 / tileSize,
    originY: centerY - height / 2 / tileSize,
    width,
    height,
  };
}

function spanOf(points: Point[], zoom: number): { x: number; y: number } {
  const projected = points.map((point) => project(point, zoom));
  return {
    x: Math.max(...projected.map((point) => point.x)) - Math.min(...projected.map((point) => point.x)),
    y: Math.max(...projected.map((point) => point.y)) - Math.min(...projected.map((point) => point.y)),
  };
}

export function pinOffset(point: Point, frame: Frame): { left: number; top: number } {
  const projected = project(point, frame.zoom);
  return {
    left: (projected.x - frame.originX) * tileSize,
    top: (projected.y - frame.originY) * tileSize,
  };
}

export function TileMap({ frame }: { frame: Frame }) {
  const scale = 2 ** frame.zoom;
  const startX = Math.floor(frame.originX);
  const startY = Math.floor(frame.originY);
  const endX = Math.floor(frame.originX + frame.width / tileSize);
  const endY = Math.floor(frame.originY + frame.height / tileSize);
  const tiles: { x: number; y: number }[] = [];
  for (let x = startX; x <= endX; x += 1) {
    for (let y = startY; y <= endY; y += 1) {
      if (y < 0 || y >= scale) continue;
      tiles.push({ x, y });
    }
  }
  return (
    <View style={{ width: frame.width, height: frame.height, overflow: "hidden", backgroundColor: "#d5d0c8" }}>
      {tiles.map((tile) => {
        const wrappedX = ((tile.x % scale) + scale) % scale;
        return (
          <Image
            key={`${frame.zoom}-${tile.x}-${tile.y}`}
            source={{ uri: `https://basemaps.cartocdn.com/rastertiles/voyager/${frame.zoom}/${wrappedX}/${tile.y}@2x.png` }}
            style={{
              position: "absolute",
              width: tileSize,
              height: tileSize,
              left: (tile.x - frame.originX) * tileSize,
              top: (tile.y - frame.originY) * tileSize,
            }}
          />
        );
      })}
    </View>
  );
}
