/**
 * Created by gjr8050 on 2/23/2017.
 */

/**
 * An object that can be extended with run-time functionality through components
 */
export abstract class Composite {
    private components: Map<string, Component>;

    // Initialize the composite with any provided components
    constructor(componentTypes: IComponent[] = []) {
        this.components = new Map<string, Component>();
        componentTypes.forEach((type: IComponent) => this.addComponent(type));
    }

    /**
     * Return the component of the given type
     * @param type: the type of component to return
     * @returns {Component}: the component, if found
     */
    public getComponent<T extends Component>(type: {new(parent: Composite): T}): T {
        return this.components.get(type.name) as T;
    }

    /**
     * Add a new component to this composite
     * @param componentType
     * @returns {Component}
     */
    public addComponent(componentType: IComponent): Component {
        const component = new componentType(this);
        this.components.set(componentType.name, component);
        return component;
    }

    /**
     * Retrieve an array of all components on this composite
     * @returns {Component[]}
     */
    protected getComponents(): Component[] {
        const components = [];
        const it = this.components.values();

        let item = it.next();
        while (item.done === false) {
            components.push(item.value);
            item = it.next();
        }

        return components;
    }

    /**
     * Invoke a method on all components (type-unsafe)
     * @param memberMethod: name of the handler to invoke
     * @param data: arbitrary data to pass to the event handler
     */
    protected invokeComponentEvents(memberMethod: string, data?: any): void {
        const it = this.components.values();

        let item = it.next();
        while (item.done === false) {
            if (typeof item.value[memberMethod] === 'function') {
                item.value[memberMethod](data);
            }

            item = it.next();
        }
    }
}

// A component constructor
export interface IComponent {
    new(parent: Composite): Component;
}

/**
 * Can be attached to a composite to extend its capabilities
 */
export abstract class Component {
    protected parent: Composite;

    constructor(parent: Composite) {
        this.parent = parent;
    }
}
