import {/*cursor*/
    readFileSync
} from 'fs';
import {
    equal
} from 'assert';
equal(readFileSync('foo'), 'bar')
