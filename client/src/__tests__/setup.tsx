import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock("framer-motion", () => {
  const createMotionComponent = (Tag: string) => ({ children, ...props }: any) => {
    const { whileHover, whileTap, whileInView, initial, animate, exit, variants, layout, layoutId, transition, viewport, custom, ...rest } = props;
    return <Tag {...rest}>{children}</Tag>;
  };

  const componentCache = new Map<string, ReturnType<typeof createMotionComponent>>();
  const componentFor = (tag: string) => {
    const existing = componentCache.get(tag);
    if (existing) return existing;
    const component = createMotionComponent(tag);
    componentCache.set(tag, component);
    return component;
  };

  const motion = new Proxy(
    {},
    {
      get: (_target, prop: string) => componentFor(prop),
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useMotionValue: () => ({ set: vi.fn(), get: vi.fn() }),
    useSpring: (v: any) => v,
    useTransform: () => "",
    useReducedMotion: () => false,
  };
});

vi.mock("react-intersection-observer", () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));
