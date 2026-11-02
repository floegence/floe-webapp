import { type Component } from 'solid-js';
import { Diagram, diagramLabelsEnUS, type DiagramLabels } from '../../../diagrams/Diagram';
import { renderMermaid } from '../hooks/useMermaid';
import type { DiagramRenderOptions } from '../../../diagrams/render';
import '../../../styles/diagrams.css';

export interface MermaidBlockProps {
  content: string;
  class?: string;
  labels?: DiagramLabels;
}

const renderLegacy = (source: string, options: DiagramRenderOptions) => renderMermaid(source, 'default', options)
  .then(svg => ({ svg, width: 0, height: 0, type: 'mermaid' }));

/** Existing public component, now backed by the shared diagram surface. */
export const MermaidBlock: Component<MermaidBlockProps> = props => (
  <Diagram source={props.content} class={props.class} labels={props.labels ?? diagramLabelsEnUS}
    render={renderLegacy} />
);
