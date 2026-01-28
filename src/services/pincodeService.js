import axios from 'axios';

export const fetchPincodeData = async (pincode) => {
    const url = `https://api.postalpincode.in/pincode/${pincode}`;
    const res = await axios.get(url, { timeout: 8000 });

    const item = res?.data?.[0];
    if (!item || item.Status !== 'Success') return null;

    const po = item?.PostOffice?.[0];
    if (!po) return null;

    // India Post gives: State, District, Block (used as Taluka)
    return {
        state: po.State || '',
        district: po.District || '',
        taluka: po.Block || po.Region || '',
    };
};
