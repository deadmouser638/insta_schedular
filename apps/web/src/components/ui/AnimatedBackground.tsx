import { motion } from 'framer-motion'

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep space background */}
      <div className="absolute inset-0 bg-zinc-950" />
      
      {/* Slowly moving mesh gradient base */}
      <motion.div
        className="absolute w-[200vw] h-[200vh] -top-[50vh] -left-[50vw] opacity-20"
        style={{
          background: 'radial-gradient(circle at center, #3b0764 0%, transparent 60%)',
        }}
        animate={{
          x: [0, 50, -50, 0],
          y: [0, -50, 50, 0],
          scale: [1, 1.1, 0.9, 1]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Floating 3D Orbs */}
      <Orb
        color="bg-purple-600"
        size="w-[500px] h-[500px]"
        initialPosition={{ top: '-10%', left: '-10%' }}
        animatePath={[
          { x: 0, y: 0 },
          { x: 100, y: 100 },
          { x: -50, y: 150 },
          { x: 0, y: 0 },
        ]}
        delay={0}
      />
      <Orb
        color="bg-pink-600"
        size="w-[400px] h-[400px]"
        initialPosition={{ top: '60%', right: '-5%' }}
        animatePath={[
          { x: 0, y: 0 },
          { x: -100, y: -50 },
          { x: -150, y: 50 },
          { x: 0, y: 0 },
        ]}
        delay={2}
      />
      <Orb
        color="bg-indigo-600"
        size="w-[600px] h-[600px]"
        initialPosition={{ bottom: '-20%', left: '20%' }}
        animatePath={[
          { x: 0, y: 0 },
          { x: 50, y: -150 },
          { x: 100, y: 0 },
          { x: 0, y: 0 },
        ]}
        delay={4}
      />

      {/* Glass overlay to frost everything together */}
      <div className="absolute inset-0 backdrop-blur-[100px] bg-zinc-950/40" />
    </div>
  )
}

function Orb({
  color,
  size,
  initialPosition,
  animatePath,
  delay
}: {
  color: string;
  size: string;
  initialPosition: any;
  animatePath: any[];
  delay: number;
}) {
  return (
    <motion.div
      className={`absolute rounded-full mix-blend-screen opacity-30 blur-3xl ${size} ${color}`}
      style={initialPosition}
      animate={{
        x: animatePath.map(p => p.x),
        y: animatePath.map(p => p.y),
        scale: [1, 1.2, 0.8, 1],
        rotate: [0, 90, 180, 270, 360]
      }}
      transition={{
        duration: 30,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay
      }}
    />
  )
}
