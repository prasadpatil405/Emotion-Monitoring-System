import { useEffect, useRef } from "react";

declare global {
  interface Window {
    THREE: any;
  }
}

export function ThreeJSBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationIdRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load Three.js dynamically
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/three@0.150.1/build/three.min.js';
    script.onload = initThreeJS;
    document.head.appendChild(script);

    function initThreeJS() {
      if (!window.THREE || !containerRef.current) return;

      const THREE = window.THREE;
      const container = containerRef.current;

      // Scene setup
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      // Store references
      sceneRef.current = scene;
      rendererRef.current = renderer;

      // Create floating emotion spheres
      const emotionSpheres: any[] = [];
      const emotions = [
        { color: 0x7C3AED, position: [2, 1, -5] }, // Primary (Violet)
        { color: 0x06B6D4, position: [-2, -1, -7] }, // Secondary (Cyan)
        { color: 0xE879F9, position: [1, -2, -6] }, // Accent (Neon Pink)
        { color: 0xF59E0B, position: [-1, 2, -8] }, // Warning (Amber) - kept for contrast
        { color: 0x8B5CF6, position: [0, 0, -9] }, // Light Violet
        { color: 0x22D3EE, position: [3, -1, -5] }, // Light Cyan
      ];

      emotions.forEach((emotion, index) => {
        const geometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.2, 16, 16);
        const material = new THREE.MeshBasicMaterial({
          color: emotion.color,
          transparent: true,
          opacity: 0.3 + Math.random() * 0.3,
          wireframe: Math.random() > 0.5
        });

        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(...emotion.position);

        // Add random movement properties
        sphere.userData = {
          originalPosition: { x: emotion.position[0], y: emotion.position[1], z: emotion.position[2] },
          rotationSpeed: { x: (Math.random() - 0.5) * 0.02, y: (Math.random() - 0.5) * 0.02 },
          floatSpeed: Math.random() * 0.01 + 0.005,
          floatAmplitude: Math.random() * 0.5 + 0.2
        };

        scene.add(sphere);
        emotionSpheres.push(sphere);
      });

      // Add particle system
      const particleGeometry = new THREE.BufferGeometry();
      const particleCount = 100;
      const positions = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 20; // x
        positions[i + 1] = (Math.random() - 0.5) * 20; // y
        positions[i + 2] = (Math.random() - 0.5) * 20; // z
      }

      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const particleMaterial = new THREE.PointsMaterial({
        color: 0x7C3AED,
        size: 0.03,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      });

      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      camera.position.z = 5;

      // Animation loop
      function animate() {
        animationIdRef.current = requestAnimationFrame(animate);

        const time = Date.now() * 0.001;

        // Animate emotion spheres
        emotionSpheres.forEach((sphere, index) => {
          const userData = sphere.userData;

          // Rotation
          sphere.rotation.x += userData.rotationSpeed.x;
          sphere.rotation.y += userData.rotationSpeed.y;

          // Floating motion
          sphere.position.y = userData.originalPosition.y +
            Math.sin(time * userData.floatSpeed + index) * userData.floatAmplitude;

          sphere.position.x = userData.originalPosition.x +
            Math.cos(time * userData.floatSpeed * 0.7 + index) * 0.3;
        });

        // Animate particles
        particles.rotation.y += 0.001;
        particles.rotation.x += 0.0005;

        renderer.render(scene, camera);
      }

      animate();

      // Handle window resize
      function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }

      window.addEventListener('resize', onWindowResize);

      return () => {
        window.removeEventListener('resize', onWindowResize);
      };
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="three-container"
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  );
}
