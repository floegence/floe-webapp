/**
 * Animation presets for Motion (Framer Motion for Solid)
 */

export const springConfig = {
  default: { stiffness: 300, damping: 30 },
  gentle: { stiffness: 150, damping: 20 },
  snappy: { stiffness: 500, damping: 25 },
  bouncy: { stiffness: 400, damping: 10 },
};

export const duration = {
  instant: 0,
  fast: 0.1,
  normal: 0.2,
  slow: 0.3,
  slower: 0.5,
};

export const easing = {
  easeOut: [0.33, 1, 0.68, 1] as const,
  easeIn: [0.32, 0, 0.67, 0] as const,
  easeInOut: [0.65, 0, 0.35, 1] as const,
  spring: [0.175, 0.885, 0.32, 1.275] as const,
};

/**
 * Common animation variants
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: duration.normal },
};

export const slideInFromLeft = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 },
  transition: { duration: duration.normal, ease: easing.easeOut },
};

export const slideInFromRight = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 20, opacity: 0 },
  transition: { duration: duration.normal, ease: easing.easeOut },
};

export const slideInFromTop = {
  initial: { y: -20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 },
  transition: { duration: duration.normal, ease: easing.easeOut },
};

export const slideInFromBottom = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 20, opacity: 0 },
  transition: { duration: duration.normal, ease: easing.easeOut },
};

export const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
  transition: { duration: duration.fast, ease: easing.easeOut },
};

export const popIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
  transition: { type: 'spring', ...springConfig.bouncy },
};

/**
 * Sidebar animation
 */
export const sidebarVariants = {
  open: {
    width: 260,
    transition: { duration: duration.normal, ease: easing.easeOut },
  },
  collapsed: {
    width: 48,
    transition: { duration: duration.normal, ease: easing.easeOut },
  },
  closed: {
    width: 0,
    transition: { duration: duration.normal, ease: easing.easeOut },
  },
};

/**
 * Panel resize animation
 */
export const panelResize = {
  transition: { duration: duration.fast, ease: easing.easeOut },
};

/**
 * List item stagger animation
 */
export const listContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const listItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: duration.fast },
};
