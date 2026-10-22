import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { MarkSceneActor, MarkSceneGround } from '../lib/markWorldScene';
import { MarkGroundObject, MarkWorldActor } from './MarkWorldPrimitives';

export function MarkGroundLayer({ ground }: { ground: MarkSceneGround[] }) {
  return (
    <>
      {ground.map((item) => (
        <View
          key={item.id}
          pointerEvents="none"
          accessible={false}
          style={[
            styles.ground,
            { left: item.left, top: item.top, width: item.width, height: item.height },
          ]}
        >
          <MarkGroundObject ground={item} />
        </View>
      ))}
    </>
  );
}

export function MarkActorLayer({ actors }: { actors: MarkSceneActor[] }) {
  return (
    <>
      {actors.map((actor) => (
        <View
          key={actor.id}
          pointerEvents="none"
          accessible={false}
          style={[
            styles.actor,
            {
              left: actor.left,
              top: actor.top,
              width: actor.width,
              height: actor.height,
              zIndex: 20 + actor.depth,
            },
          ]}
        >
          <MarkWorldActor actor={actor} />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  ground: { position: 'absolute', zIndex: 0 },
  actor: { position: 'absolute' },
});
