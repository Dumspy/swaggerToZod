import { refResolver } from "./refResolver";

function arrayToString<T>(arr: T[]) {
    return '[' + arr.map(item => `'${item}'`).join(', ') + ']';
}

type parseObject = { type: string, imports?: string[] }

const parse = async (obj: any): Promise<parseObject> => {
    let type = obj?.type ? obj.type : typeof obj
    if (typeof obj?.type === 'object') {
        type = typeof obj
    }

    if (obj?.$ref) {
        const ref = await refResolver(obj.$ref)
        return { type: ref.type, imports: [`import ${ref.type} from "./${ref.type}"`] }
    }

    switch (type) {
        case 'string':
            if (obj.enum) {
                return { type: `z.enum(${arrayToString(obj.enum)})` }
            }
            return { type: 'z.string()' }
        case 'integer':
        case 'number':
            return { type: 'z.number()' }
        case 'boolean':
            return { type: 'z.boolean()' }
        case 'timestamp':
            return { type: 'z.string().datetime()' }
        case 'array':
            if (obj.items.$ref) {
                const ref = await refResolver(obj.items.$ref)
                return { type: `z.array(${ref.type})`, imports: [`import ${ref.type} from "./${ref.type}"`] }
            }

            const parsedItems = await parse(obj.items.type)
            return { type: `z.array(${parsedItems.type})`, imports: [...parsedItems.imports || []] }
        case 'object':
            if (obj === null) {
                return { type: 'z.null()' }
            }
            const imports: string[] = []
            return {
                type: `z.object({${await Promise.all(Object.entries(obj).map(async ([k, v]: any) => {const parsed = v.properties ? (await parse(v.properties)) : (await parse(v));imports.push(...parsed.imports || []);return `'${k}':${parsed.type}`}))}})`,
                imports
            }
        case 'undefined':
            return { type: 'z.undefined()' }
        default:
            console.log('missing case for', type)
            return { type: 'z.unknown()' }
    }
};

export const toZod = (obj: any) => {
    return parse(obj)
};