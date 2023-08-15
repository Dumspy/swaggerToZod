import { format } from "prettier";

function arrayToString<T>(arr: T[]){
    return '[' + arr.map(item => `'${item}'`).join(', ') + ']';
}

export const toZod = async (obj: any, name: string = 'schema') => {
    const parse = (obj: any): string => {
        let type = obj?.type ? obj.type : typeof obj
        if(typeof obj?.type === 'object'){
            type = typeof obj
        }

        switch (type) {
            case 'string':
                if(obj.enum){
                    return `z.enum(${arrayToString(obj.enum)})`
                }
                return 'z.string()';
            case 'integer':
            case 'number':
                return 'z.number()';
            case 'bigint':
                return 'z.number().int()';
            case 'boolean':
                return 'z.boolean()';
            case 'timestamp':
                return 'z.string().datetime()'
            case 'array':
                if (Array.isArray(obj)) {
                    const options = obj
                        .map((obj) => parse(obj))
                        .reduce(
                            (acc: string[], curr: string) =>
                                acc.includes(curr) ? acc : [...acc, curr],
                            []
                        );
                    if (options.length === 1) {
                        return `z.array(${options[0]})`;
                    } else if (options.length > 1) {
                        return `z.array(z.union([${options}]))`;
                    } else {
                        return `z.array(z.unknown())`;
                    }
                }
                return 'z.unknown()' 
                break
            case 'object':
                if (obj === null) {
                    return 'z.null()';
                }
                // @ts-ignore
                return `z.object({${Object.entries(obj).map(([k, v]) => `'${k}':${v.properties ? parse(v.properties) : parse(v)}`)}})`;
            case 'undefined':
                return 'z.undefined()';
            default:
                console.log(type)
                return 'z.unknown()';
        }
    };

    return parse(obj)
};