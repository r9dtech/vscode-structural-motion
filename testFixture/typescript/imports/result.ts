import {
    equal
} from 'assert';
import {
    readFileSync
} from 'fs';
equal(readFileSync('foo'), 'bar')
